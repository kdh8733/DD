package ws

import (
	"context"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

type Message struct {
	JobID   string `json:"job_id"`
	Type    string `json:"type"`    // log/status/stats
	Content string `json:"content"`
	Time    string `json:"time"`
}

type Client struct {
	jobID string
	conn  *websocket.Conn
	send  chan []byte
	hub   *Hub
}

type subscription struct {
	client *Client
	jobID  string
}

type Hub struct {
	rooms      map[string]map[*Client]bool
	register   chan *subscription
	unregister chan *subscription
	broadcast  chan *Message
	rdb        *redis.Client
	log        *zap.Logger
	mu         sync.RWMutex
	subscribed map[string]bool // tracks which jobIDs have Redis Pub/Sub subscriptions
}

func NewHub(rdb *redis.Client, log *zap.Logger) *Hub {
	return &Hub{
		rooms:      make(map[string]map[*Client]bool),
		register:   make(chan *subscription),
		unregister: make(chan *subscription),
		broadcast:  make(chan *Message, 256),
		rdb:        rdb,
		log:        log,
		subscribed: make(map[string]bool),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case sub := <-h.register:
			if h.rooms[sub.jobID] == nil {
				h.rooms[sub.jobID] = make(map[*Client]bool)
			}
			h.rooms[sub.jobID][sub.client] = true

			// Start Redis Pub/Sub subscription for this job if not already subscribed
			h.mu.Lock()
			if !h.subscribed[sub.jobID] {
				h.subscribed[sub.jobID] = true
				go h.SubscribeJobLogs(sub.jobID)
			}
			h.mu.Unlock()

		case sub := <-h.unregister:
			if clients, ok := h.rooms[sub.jobID]; ok {
				if _, exists := clients[sub.client]; exists {
					delete(clients, sub.client)
					close(sub.client.send)
					if len(clients) == 0 {
						delete(h.rooms, sub.jobID)
					}
				}
			}

		case msg := <-h.broadcast:
			if clients, ok := h.rooms[msg.JobID]; ok {
				data := []byte(`{"type":"` + msg.Type + `","content":"` + msg.Content + `","time":"` + msg.Time + `"}`)
				for client := range clients {
					select {
					case client.send <- data:
					default:
						close(client.send)
						delete(clients, client)
					}
				}
			}
		}
	}
}

func (h *Hub) SubscribeJobLogs(jobID string) {
	ctx := context.Background()
	channel := "job:logs:" + jobID
	pubsub := h.rdb.Subscribe(ctx, channel)
	defer pubsub.Close()

	ch := pubsub.Channel()
	for msg := range ch {
		h.broadcast <- &Message{
			JobID:   jobID,
			Type:    "log",
			Content: msg.Payload,
			Time:    time.Now().Format(time.RFC3339),
		}
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func ServeWS(hub *Hub, c echo.Context, jobID string) error {
	conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}

	client := &Client{
		jobID: jobID,
		conn:  conn,
		send:  make(chan []byte, 256),
		hub:   hub,
	}

	hub.register <- &subscription{client: client, jobID: jobID}

	go client.writePump()
	go client.readPump()

	return nil
}

func (c *Client) writePump() {
	defer c.conn.Close()
	for msg := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			return
		}
	}
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- &subscription{client: c, jobID: c.jobID}
		c.conn.Close()
	}()
	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			return
		}
	}
}
