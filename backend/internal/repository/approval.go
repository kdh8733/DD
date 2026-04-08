package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/dookdak/dookdak/backend/internal/model"
)

type ApprovalRepository interface {
	CreateApproval(ctx context.Context, approval *model.Approval) (int64, error)
	GetPendingApprovals(ctx context.Context) ([]*model.Approval, error)
	ApproveJob(ctx context.Context, id int64, approvedBy, comment string) error
	RejectJob(ctx context.Context, id int64, approvedBy, comment string) error
}

type pgApprovalRepository struct {
	pool *pgxpool.Pool
}

func NewApprovalRepository(pool *pgxpool.Pool) ApprovalRepository {
	return &pgApprovalRepository{pool: pool}
}

func (r *pgApprovalRepository) CreateApproval(ctx context.Context, approval *model.Approval) (int64, error) {
	var id int64
	err := r.pool.QueryRow(ctx,
		`INSERT INTO approvals (job_id, requested_by, status, diff_preview, created_at)
		 VALUES ($1, $2, 'pending', $3, NOW()) RETURNING id`,
		approval.JobID, approval.RequestedBy, approval.DiffPreview,
	).Scan(&id)
	return id, err
}

func (r *pgApprovalRepository) GetPendingApprovals(ctx context.Context) ([]*model.Approval, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, job_id, requested_by, status, diff_preview, created_at
		 FROM approvals WHERE status = 'pending' ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var approvals []*model.Approval
	for rows.Next() {
		a := &model.Approval{}
		if err := rows.Scan(&a.ID, &a.JobID, &a.RequestedBy, &a.Status, &a.DiffPreview, &a.CreatedAt); err != nil {
			return nil, err
		}
		approvals = append(approvals, a)
	}
	return approvals, nil
}

func (r *pgApprovalRepository) ApproveJob(ctx context.Context, id int64, approvedBy, comment string) error {
	now := time.Now()
	_, err := r.pool.Exec(ctx,
		"UPDATE approvals SET status='approved', approved_by=$2, comment=$3, resolved_at=$4 WHERE id=$1",
		id, approvedBy, comment, now)
	return err
}

func (r *pgApprovalRepository) RejectJob(ctx context.Context, id int64, approvedBy, comment string) error {
	now := time.Now()
	_, err := r.pool.Exec(ctx,
		"UPDATE approvals SET status='rejected', approved_by=$2, comment=$3, resolved_at=$4 WHERE id=$1",
		id, approvedBy, comment, now)
	return err
}
