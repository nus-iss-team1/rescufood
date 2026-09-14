package notify

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/aws/aws-sdk-go-v2/service/sqs"
)

type fakeSQS struct {
	input *sqs.SendMessageInput
	err   error
}

func (f *fakeSQS) SendMessage(_ context.Context, params *sqs.SendMessageInput, _ ...func(*sqs.Options)) (*sqs.SendMessageOutput, error) {
	f.input = params
	return &sqs.SendMessageOutput{}, f.err
}

func TestSQSPublisher_SendOrgApproved(t *testing.T) {
	fake := &fakeSQS{}
	p := &SQSPublisher{Client: fake, QueueURL: "https://example/queue"}

	if err := p.SendOrgApproved(context.Background(), "ops@freshmart.sg", "Fresh Mart", "org-123"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if fake.input == nil {
		t.Fatal("SendMessage was not called")
	}
	if got := *fake.input.QueueUrl; got != "https://example/queue" {
		t.Fatalf("QueueUrl = %q, want %q", got, "https://example/queue")
	}

	var msg map[string]any
	if err := json.Unmarshal([]byte(*fake.input.MessageBody), &msg); err != nil {
		t.Fatalf("body is not valid JSON: %v", err)
	}
	if msg["type"] != "org_approved" || msg["channel"] != "email" || msg["recipientEmail"] != "ops@freshmart.sg" {
		t.Fatalf("unexpected message: %+v", msg)
	}
	if msg["eventId"] != "org:org-123:approved" {
		t.Fatalf("eventId = %v, want org:org-123:approved", msg["eventId"])
	}
	if _, present := msg["recipientUserId"]; present {
		t.Fatalf("org_approved should carry no recipientUserId, got %v", msg["recipientUserId"])
	}
	payload, ok := msg["payload"].(map[string]any)
	if !ok || payload["orgName"] != "Fresh Mart" {
		t.Fatalf("unexpected payload: %+v", msg["payload"])
	}
}

func TestSQSPublisher_SendWelcome(t *testing.T) {
	fake := &fakeSQS{}
	p := &SQSPublisher{Client: fake, QueueURL: "https://example/queue"}

	if err := p.SendWelcome(context.Background(), "sam@freshmart.sg", "Sam", "donor", "sub-abc"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if fake.input == nil {
		t.Fatal("SendMessage was not called")
	}

	var msg map[string]any
	if err := json.Unmarshal([]byte(*fake.input.MessageBody), &msg); err != nil {
		t.Fatalf("body is not valid JSON: %v", err)
	}
	if msg["type"] != "user_welcome" || msg["channel"] != "email" || msg["recipientEmail"] != "sam@freshmart.sg" {
		t.Fatalf("unexpected message: %+v", msg)
	}
	if msg["recipientUserId"] != "sub-abc" || msg["eventId"] != "user:sub-abc:welcome" {
		t.Fatalf("unexpected identity: userId=%v eventId=%v", msg["recipientUserId"], msg["eventId"])
	}
	payload, ok := msg["payload"].(map[string]any)
	if !ok || payload["name"] != "Sam" || payload["orgType"] != "donor" {
		t.Fatalf("unexpected payload: %+v", msg["payload"])
	}
}

func TestSQSPublisher_SendWelcome_propagatesError(t *testing.T) {
	fake := &fakeSQS{err: errors.New("boom")}
	p := &SQSPublisher{Client: fake, QueueURL: "q"}
	if err := p.SendWelcome(context.Background(), "a@b.com", "A", "", "sub-1"); err == nil {
		t.Fatal("expected error to propagate")
	}
}

func TestSQSPublisher_SendOrgApproved_propagatesError(t *testing.T) {
	fake := &fakeSQS{err: errors.New("boom")}
	p := &SQSPublisher{Client: fake, QueueURL: "q"}
	if err := p.SendOrgApproved(context.Background(), "a@b.com", "Org", "org-1"); err == nil {
		t.Fatal("expected error to propagate")
	}
}
