---
class: dgm-centre
---

<div class="dgm-eyebrow">Use case 07 of 07</div>

<div class="dgm-section-title"><span class="accent">Notification</span></div>

<div class="dgm-actors">Platform user &middot; the system</div>

<div class="dgm-cases">Deliver an email &middot; Populate the in-app feed &middot; Read and clear notifications</div>

<!--
USE CASE 07: NOTIFICATION

Four figures follow: the analysis model and its sequence, which say what the
system must contain to support these use cases, then the design model and its
sequence, which say how it was built.
-->

---
class: flex flex-col dgm-page
---

# Notification: analysis model

<div class="dgm-sub">The one workflow that is not request and response.</div>

<div class="dgm-figure">
<svg viewBox="-16 0 1232 560" fill="none">
<UmlDefs p="a5" />
<UmlActor :x="48" :y="100" label="Platform" sub="administrator" />
<UmlActor :x="48" :y="430" label="Platform user" />
<line x1="64" y1="86" x2="100" y2="92" stroke="#8a8a8a" stroke-width="1.2" />
<line x1="64" y1="422" x2="100" y2="417" stroke="#8a8a8a" stroke-width="1.2" />
<UmlClass :x="100" :y="60" :w="200" name="AdminActionView" stereotype="boundary" :ops="['approveOrganisation(id)']" />
<UmlClass :x="100" :y="370" :w="200" name="NotificationFeedView" stereotype="boundary" :ops="['listNotifications()', 'unreadCount()', 'markRead(id)']" />
<line x1="300" y1="92" x2="360" y2="88" stroke="#8a8a8a" stroke-width="1.2" />
<line x1="300" y1="417" x2="360" y2="430" stroke="#8a8a8a" stroke-width="1.2" />
<UmlClass :x="360" :y="40" :w="250" name="EventPublication" stereotype="control" :ops="['validateTransition()', 'writeStatusAndAudit()', 'publishEvent(type, to)']" :accent="true" />
<UmlClass :x="360" :y="160" :w="250" name="EventQueue" stereotype="boundary" note="Amazon SQS + dead-letter queue" />
<UmlClass :x="360" :y="245" :w="250" name="NotificationDelivery" stereotype="control" :ops="['consume(message)', 'skipIfAlreadyDelivered()', 'renderTemplate(type)', 'deliverInApp()', 'deliverEmail()']" :accent="true" />
<UmlClass :x="360" :y="400" :w="250" name="FeedQuery" stereotype="control" :ops="['list(userId, paging)', 'countUnread(userId)', 'markRead(id, userId)']" :accent="true" />
<line x1="485" y1="135" x2="485" y2="160" stroke="#1f6b45" stroke-width="1.3" marker-end="url(#a5-arr)" />
<text x="492" y="153" style="font-size:8.5px" fill="#5a5a5a">publish</text>
<line x1="485" y1="216" x2="485" y2="245" stroke="#1f6b45" stroke-width="1.3" marker-end="url(#a5-arr)" />
<text x="492" y="238" style="font-size:8.5px" fill="#5a5a5a">long poll</text>
<line x1="610" y1="270" x2="690" y2="110" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a5-open)" />
<line x1="610" y1="290" x2="690" y2="230" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a5-open)" />
<line x1="610" y1="330" x2="690" y2="380" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a5-open)" />
<line x1="610" y1="350" x2="690" y2="490" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a5-open)" />
<line x1="610" y1="440" x2="690" y2="410" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a5-open)" />
<UmlClass :x="690" :y="30" :w="250" name="NotificationMessage" stereotype="entity" :attrs="['type', 'recipient', 'payload', 'event key']" />
<UmlClass :x="690" :y="180" :w="250" name="DeliveryRecord" stereotype="entity" :attrs="['channel: email | in_app', 'outcome', 'deliveredAt']" :ops="['duplicatesEvent(e)']" />
<UmlClass :x="690" :y="340" :w="250" name="InAppNotification" stereotype="entity" :attrs="['title, body', 'readAt', 'createdAt']" />
<UmlClass :x="690" :y="470" :w="250" name="EmailChannel" stereotype="boundary" :ops="['send(to, subject, body)']" />
<UmlNote :x="980" :y="30" :w="200" title="different style" :lines="['Unlike the request and', 'response flows, delivery is', 'asynchronous. The caller', 'gets its 200 OK before any', 'email is sent.']" />
<UmlNote :x="980" :y="165" :w="200" title="duplicate guard" :lines="['A delivery is recorded per', 'event and per channel, and a', 'second attempt at the same', 'pair is skipped.']" />
<UmlNote :x="980" :y="285" :w="200" title="failure handling" :lines="['A temporary failure is', 'retried by the queue. A', 'permanent failure is', 'recorded instead of retried,', 'and exhausted messages land', 'in the dead-letter queue.']" />
<UmlNote :x="980" :y="430" :w="200" title="accepted risk" :lines="['Events are published after', 'commit, not through an', 'outbox. If the queue is', 'unavailable the notification', 'is dropped: a missing email', 'beats a rolled-back claim.']" />
</svg>
</div>

<!--
FIGURE: NOTIFICATION ANALYSIS MODEL

Notifications follow a different interaction style from every other use case in
the system, and the model is drawn to make that difference explicit.

The trigger is an ordinary state change. When a platform administrator approves
an organisation, the publishing control validates that the organisation is
pending or suspended, updates its status and records an audit entry in one
transaction, publishes a message, and returns 200 OK immediately. The
administrator does not wait for an email to be sent.

EventQueue is modelled as a boundary class because it is where the use case
leaves one process and arrives in another. Everything to its left belongs to
the service that produced the event; everything to its right belongs to the
notifications service, which long-polls the queue and picks the message up on
its own schedule.

The delivery control does four things in order: it skips the message if this
event has already been delivered on this channel, renders the message from a
template chosen by type, writes the in-app notification row, and then forwards
the payload to the email provider. Events addressed to a platform user produce
an in-app notification before the email, and the two deliveries are tracked
separately, which is why DeliveryRecord carries a channel.

DeliveryRecord is the entity that makes the workflow safe to retry. It knows
which event and which channel it represents and decides whether an incoming
message duplicates one already delivered. Without it, a redelivered queue
message would send a second email.

The second control class, FeedQuery, is the ordinary request-and-response half
of the same feature: the platform web app reads its unread count and its feed
through it. The two halves share the same entity, which is why the in-app
notification is written by the consumer and read by the controller.

The failure policy is deliberate. A temporary failure is left for the queue to
retry; a permanent failure is recorded rather than retried indefinitely, and
messages that exhaust their attempts land in the dead-letter queue, where a
CloudWatch alarm surfaces them.
-->

---
class: flex flex-col dgm-page
---

# Notification: analysis sequence

<div class="dgm-sub">Delivering one message: in-app first, email once, delete unless temporary.</div>

<div class="dgm-figure">
<img src="/sequences/07-notification-analysis.png" alt="analysis sequence diagram" />
</div>

<!--
FIGURE: NOTIFICATION, ANALYSIS SEQUENCE

The analysis sequence traces delivering one message. NotificationDelivery
consumes the message from the EventQueue and reads its type, recipient,
payload and event key. If the recipient is a platform user, it renders and
stores an InAppNotification unless one already exists for that event. It
then checks the DeliveryRecord to see whether the email has already been
sent, and if not renders it, sends it through the EmailChannel and records
the outcome. The message is deleted unless the failure was temporary, in
which case it stays on the queue for retry.
-->

---
class: flex flex-col dgm-page
---

# Notification: design model

<div class="dgm-sub">Two producers, one queue, one consumer with two delivery channels.</div>

<div class="dgm-figure">
<svg viewBox="-49 0 1298 590" fill="none">
<UmlDefs p="d5" />
<UmlClass :x="30" :y="30" :w="240" name="NotificationsPublisher" stereotype="publisher · listings" :ops="['claimCreated()', 'claimCancelled()', 'pickupCompleted()', 'pickupReminder()', 'listingExpired()']" />
<UmlClass :x="30" :y="190" :w="160" name="notify.SQSPublisher" stereotype="publisher · profile" :ops="['SendOrgApproved()', 'SendWelcome()']" />
<UmlComponent :x="30" :y="320" :w="240" :h="60" name="notifications queue" stereotype="AWS SQS" :lines="['+ dead-letter queue']" :muted="true" />
<line x1="230" y1="155" x2="230" y2="320" stroke="#1f6b45" stroke-width="1.3" marker-end="url(#d5-arr)" />
<line x1="110" y1="270" x2="110" y2="320" stroke="#1f6b45" stroke-width="1.3" marker-end="url(#d5-arr)" />
<line x1="270" y1="350" x2="330" y2="350" stroke="#1f6b45" stroke-width="1.3" marker-end="url(#d5-arr)" />
<text x="300" y="343" text-anchor="middle" style="font-size:8.5px" fill="#5a5a5a">long poll</text>
<UmlClass :x="330" :y="150" :w="265" name="NotificationMessageDto" stereotype="dto" :attrs="['type', 'to: email, userId', 'payload']" />
<UmlClass :x="330" :y="290" :w="265" name="SqsConsumerService" stereotype="service" :ops="['poll()', 'process(message)', 'deliverInApp(msg)', 'deliverEmail(msg)', 'safeRecord(outcome)']" :accent="true" />
<UmlClass :x="330" :y="460" :w="265" name="NotificationsController" stereotype="controller" :ops="['@Get list()', '@Get unread-count', '@Patch markRead()', '@Delete remove()']" :accent="true" />
<line x1="462" y1="290" x2="462" y2="245" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d5-open)" />
<text x="469" y="275" style="font-size:8.5px" fill="#5a5a5a">«parse»</text>
<UmlClass :x="660" :y="30" :w="270" name="MailerService" stereotype="service" note="throws PermanentDeliveryError" :ops="['send(to, subject, body)']" />
<UmlClass :x="660" :y="140" :w="270" name="templates / in-app-templates" stereotype="domain rule" :ops="['renderEmail(type, payload)', 'renderInApp(type, payload)']" />
<UmlClass :x="660" :y="250" :w="270" name="NotificationsRepository" stereotype="repository" :ops="['alreadyDelivered(evt, chan)', 'record(entry)', 'createInApp(entry)', 'listInApp(userId)', 'countUnread(userId)', 'markRead(id, userId)']" />
<UmlClass :x="975" :y="250" :w="210" name="notifications" stereotype="table" :attrs="['recipient_user_id', 'channel, type, outcome', 'event key (unique)', 'read_at']" />
<line x1="595" y1="300" x2="660" y2="90" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d5-open)" />
<line x1="595" y1="320" x2="660" y2="200" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d5-open)" />
<line x1="595" y1="345" x2="660" y2="305" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d5-open)" />
<line x1="595" y1="490" x2="660" y2="385" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d5-open)" />
<line x1="930" y1="320" x2="975" y2="310" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#d5-open)" />
<UmlNote :x="975" :y="30" :w="210" title="duplicate guard" :lines="['The consumer asks the', 'repository whether this event', 'and channel were already', 'delivered and skips if they', 'were. Every delivery is', 'recorded with its outcome.']" />
<UmlNote :x="975" :y="400" :w="210" title="error policy" :lines="['A temporary failure is left', 'on the queue to be retried.', 'A permanent failure is', 'recorded and the message', 'deleted, so a message that', 'can never succeed does not', 'cycle forever.']" />
</svg>
</div>

<!--
FIGURE: NOTIFICATION DESIGN MODEL

Two producers write to the same queue. The listings service publishes claim
created, claim cancelled, pickup reminder, pickup completed and listing
expired; the profile service publishes organisation approved and welcome. Both
publish after their own transaction has committed, and neither waits for a
result. The producers share no code, because they are written in different
languages, but they share a message contract, which is what
NotificationMessageDto validates on the way in.

SqsConsumerService is the whole inbound half of the service. poll long-polls
the queue, process handles one message, and the two deliver methods fan it out
to the in-app feed and to email. Processing is ordered so the in-app
notification is written before the email is attempted, and each delivery is
recorded separately, so a failed email does not remove the in-app alert the
user has already been shown.

The duplicate guard is the design's answer to at-least-once delivery. SQS can
redeliver a message, so alreadyDelivered is consulted for the event and channel
pair before anything is sent, and a repeat is skipped rather than resent. The
unique event key on the table is the backstop.

The error policy distinguishes two cases, which is the point of
PermanentDeliveryError. A temporary failure, such as the mail relay being
briefly unavailable, is allowed to propagate so the message stays on the queue
and is retried. A permanent failure, such as a malformed recipient, is recorded
with its outcome and the message is deleted, so a message that can never
succeed does not cycle until it reaches the dead-letter queue.

Template rendering is a type-to-renderer map rather than a switch, which is the
same Strategy pattern used in the SDK. Adding a notification type is adding an
entry, and an unknown type raises UnsupportedNotificationTypeError rather than
silently sending an empty email.

NotificationsController is the other half: it serves the feed, the unread count
and the read and delete actions to the platform web app, reading the same rows
the consumer writes.
-->

---
class: flex flex-col dgm-page
---

# Notification: design sequence

<div class="dgm-sub">SqsConsumerService: poll, validate, deliver in-app, deliver email, delete.</div>

<div class="dgm-figure">
<img src="/sequences/07-notification-design.png" alt="design sequence diagram" />
</div>

<!--
FIGURE: NOTIFICATION, DESIGN SEQUENCE

The design sequence follows SqsConsumerService. poll long-polls the queue
for up to 20 seconds and passes each message to process, which validates it
against NotificationMessageDto; an invalid message is a permanent failure.
deliverInApp renders the in-app text and calls createInApp, where a
duplicate event is skipped by the table's unique key. deliverEmail asks
alreadyDelivered for the email channel, then renders the email, calls
MailerService.send and records the outcome. Finally, handle deletes the
message unless the outcome was a temporary failure, which leaves it on the
queue to be retried and, after repeated failures, moved to the dead-letter
queue.
-->
