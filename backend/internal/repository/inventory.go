package repository

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/dookdak/dookdak/backend/internal/model"
)

type InventoryRepository interface {
	LoadGroup(dir, groupName string) (*model.InventoryGroup, error)
	ListGroups(dir string) ([]string, error)
	SearchHosts(dir, query string) ([]model.Host, error)
}

type fsInventoryRepository struct{}

func NewInventoryRepository() InventoryRepository {
	return &fsInventoryRepository{}
}

func (r *fsInventoryRepository) LoadGroup(dir, groupName string) (*model.InventoryGroup, error) {
	path := filepath.Join(dir, groupName+".json")
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read inventory group %s: %w", groupName, err)
	}

	var group model.InventoryGroup
	if err := json.Unmarshal(data, &group); err != nil {
		return nil, fmt.Errorf("parse inventory group %s: %w", groupName, err)
	}
	return &group, nil
}

func (r *fsInventoryRepository) ListGroups(dir string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read inventory dir: %w", err)
	}

	var groups []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".json") {
			groups = append(groups, strings.TrimSuffix(e.Name(), ".json"))
		}
	}
	return groups, nil
}

func (r *fsInventoryRepository) SearchHosts(dir, query string) ([]model.Host, error) {
	groups, err := r.ListGroups(dir)
	if err != nil {
		return nil, err
	}

	query = strings.ToLower(query)
	var matched []model.Host
	for _, g := range groups {
		group, err := r.LoadGroup(dir, g)
		if err != nil {
			continue
		}
		for _, h := range group.Hosts {
			if strings.Contains(strings.ToLower(h.Hostname), query) ||
				strings.Contains(h.IP, query) {
				matched = append(matched, h)
			}
		}
	}
	return matched, nil
}
