package model

import "time"

type InventoryGroup struct {
	Group       string    `json:"group"`
	Platform    string    `json:"platform"`
	Environment string    `json:"environment"`
	DC          string    `json:"dc"`
	Hosts       []Host    `json:"hosts"`
	LastSynced  time.Time `json:"last_synced"`
}

type Host struct {
	Hostname     string     `json:"hostname"`
	IP           string     `json:"ip"`
	OS           string     `json:"os"`
	Status       string     `json:"status"`
	LastDeployed *time.Time `json:"last_deployed"`
}
