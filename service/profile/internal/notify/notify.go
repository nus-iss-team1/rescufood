// Package notify publishes notification events to the SQS queue
// consumed by service/notifications, which owns the actual email
// sending and the in-app notification records.
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
	Type            string         `json:"type"`
	Channel         string         `json:"channel"`
	RecipientEmail  string         `json:"recipientEmail"`
	RecipientUserID string         `json:"recipientUserId,omitempty"`
	EventID         string         `json:"eventId,omitempty"`
	Payload         map[string]any `json:"payload,omitempty"`
}

// SendOrgApproved publishes an org_approved notification. orgID gives
// the event a stable identity for duplicate-processing protection; the
// org contact is not necessarily a platform user, so no in-app record
// is created.
func (p *SQSPublisher) SendOrgApproved(ctx context.Context, to, orgName, orgID string) error {
	return p.publish(ctx, notificationMessage{
		Type:           "org_approved",
		Channel:        "email",
		RecipientEmail: to,
		EventID:        "org:" + orgID + ":approved",
		Payload:        map[string]any{"orgName": orgName},
	})
}

// SendWelcome publishes a user_welcome notification for a newly
// provisioned account. cognitoSub identifies the recipient for the
// in-app record and gives the event a stable identity. orgType tailors
// the copy and may be empty.
func (p *SQSPublisher) SendWelcome(ctx context.Context, to, name, orgType, cognitoSub string) error {
	return p.publish(ctx, notificationMessage{
		Type:            "user_welcome",
		Channel:         "email",
		RecipientEmail:  to,
		RecipientUserID: cognitoSub,
		EventID:         "user:" + cognitoSub + ":welcome",
		Payload:         map[string]any{"name": name, "orgType": orgType},
	})
}

func (p *SQSPublisher) publish(ctx context.Context, msg notificationMessage) error {
	body, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	_, err = p.Client.SendMessage(ctx, &sqs.SendMessageInput{
		QueueUrl:    aws.String(p.QueueURL),
		MessageBody: aws.String(string(body)),
	})
	return err
}
