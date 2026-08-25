// Package notify publishes notification events to the SQS queue
// consumed by service/notifications, which owns the actual email
// sending.
package notify

import (
	"context"
	"encoding/json"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
)

// SendMessageAPI is the subset of *sqs.Client this package needs, so
// tests can substitute a fake instead of a real queue.
type SendMessageAPI interface {
	SendMessage(ctx context.Context, params *sqs.SendMessageInput, optFns ...func(*sqs.Options)) (*sqs.SendMessageOutput, error)
}

// SQSPublisher publishes one notification message per call.
type SQSPublisher struct {
	Client   SendMessageAPI
	QueueURL string
}

type notificationMessage struct {
	Type           string         `json:"type"`
	Channel        string         `json:"channel"`
	RecipientEmail string         `json:"recipientEmail"`
	Payload        map[string]any `json:"payload,omitempty"`
}

// SendOrgApproved publishes an org_approved notification; the
// notification service turns it into the actual email.
func (p *SQSPublisher) SendOrgApproved(ctx context.Context, to, orgName string) error {
	body, err := json.Marshal(notificationMessage{
		Type:           "org_approved",
		Channel:        "email",
		RecipientEmail: to,
		Payload:        map[string]any{"orgName": orgName},
	})
	if err != nil {
		return err
	}
	_, err = p.Client.SendMessage(ctx, &sqs.SendMessageInput{
		QueueUrl:    aws.String(p.QueueURL),
		MessageBody: aws.String(string(body)),
	})
	return err
}
