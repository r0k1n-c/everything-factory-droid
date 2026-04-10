---
name: agent-messaging-protocol
description: Structured inter-agent messaging with inbox/outbox semantics, request-response correlation, and minimal lifecycle management for multi-agent coordination.
origin: EFD
disable-model-invocation: true
---

# Agent Messaging Protocol

When multiple agents collaborate — whether through Missions, Custom Droids, or parallel sessions — they need a way to communicate beyond return values. This skill defines a lightweight, filesystem-based messaging protocol with inbox/outbox semantics, request-response correlation, and minimal lifecycle management. It provides structured communication without requiring external services.

## When to Use

- Multi-agent workflows where agents need to exchange information beyond simple return values
- Request-response patterns (Agent A asks Agent B a question, waits for answer)
- Status broadcasting (task completion notifications, progress updates)
- Approval flows (Agent requests human or orchestrator approval before proceeding)
- Any coordination that can't be solved by Task tool's single-return-value model

## When NOT to Use

| Instead | Use |
| --- | --- |
| One-shot subagent delegation | Task tool (returns single result) |
| Simple parallel dispatch | team-builder |
| Persistent task tracking | dag-task-graph |
| Background result polling | background-job-injection |

## Core Concepts

**Message Types:**
- `notification` — One-way, no response expected (status update, broadcast)
- `request` — Expects a response, has a `request_id` for correlation
- `response` — Reply to a specific request, carries the `request_id`

**Message Lifecycle:**
```
new → read → (replied | closed)
```

- `new` — Delivered to inbox, not yet consumed
- `read` — Recipient has seen the message
- `replied` — A response has been sent (for requests only)
- `closed` — Conversation complete, can be cleaned up

## Data Model

Message store location: `.factory/messages/`
Each agent has an inbox file: `.factory/messages/{agent-id}.inbox.jsonl`
Archive: `.factory/messages/archive/`

**Message structure:**
```json
{
  "message_id": "msg-{ulid}",
  "request_id": "req-{ulid}|null",
  "type": "notification|request|response",
  "sender": "agent-id",
  "target": "agent-id|broadcast",
  "subject": "short description",
  "body": "message content",
  "status": "new|read|replied|closed",
  "in_reply_to": "message_id|null",
  "created_at": "ISO timestamp",
  "read_at": "ISO timestamp|null",
  "ttl_seconds": 3600,
  "metadata": {}
}
```

## Operations

- `send_message(target, subject, body, type?, request_id?)` — Append to target's inbox. For requests, auto-generate request_id if not provided. Returns message_id.
- `read_inbox(agent_id, filter?)` — Read messages from inbox. Mark as read. Optional filter by status, type, or sender.
- `reply_to(message_id, body)` — Send a response, auto-filling request_id and in_reply_to. Mark original as replied.
- `ack(message_id)` — Mark message as closed (conversation done).
- `broadcast(subject, body)` — Send notification to all known agents.
- `poll_response(request_id, timeout?)` — Wait for a response to a specific request.
- `cleanup(older_than?)` — Archive closed messages older than threshold.

## Request-Response Pattern

```
Agent A                              Agent B
   |                                    |
   |-- send_message(B, "review X",     |
   |   type=request) ----------------->|
   |   [returns request_id=req-001]    |
   |                                    |
   |                                    |-- read_inbox(B)
   |                                    |   [sees req-001, status=new]
   |                                    |
   |                                    |-- reply_to(msg-002, "LGTM")
   |   <--------------------------------|
   |                                    |
   |-- poll_response(req-001)          |
   |   [gets response body="LGTM"]     |
   |                                    |
   |-- ack(msg-003)                    |
   |   [closes conversation]           |
```

## Protocol Rules

1. **JSONL format** — One JSON object per line in inbox files (append-friendly, no parse-whole-file)
2. **Idempotent reads** — Reading doesn't delete; status transitions are explicit
3. **Request-response correlation** — Every response carries the request_id of the original request
4. **Single target** — Messages go to one agent or broadcast (no multicast groups)
5. **TTL enforcement** — Expired messages are skipped during read_inbox
6. **No guaranteed delivery** — Filesystem-based; if the inbox file is corrupted, messages are lost
7. **Agent IDs** — Use kebab-case identifiers that match Custom Droid names or role names

## Safety Guards

- **Inbox size limit** — Warn at 100 messages, auto-archive closed messages at 200
- **TTL enforcement** — Default 1 hour for notifications, 24 hours for requests
- **No recursive messaging** — An agent should not send messages to itself
- **Broadcast throttle** — Max 10 broadcasts per session to prevent spam
- **Body size limit** — Max 2000 chars per message body (summaries, not full artifacts)

## Best Practices

- Use notifications for status updates, requests for decisions
- Keep message bodies concise — reference files/artifacts instead of embedding content
- Always close conversations with ack after receiving a satisfactory response
- Use meaningful subjects that enable filtering
- Clean up inboxes at session end

## Anti-Patterns

- Using messages for large data transfer (use shared files instead)
- Leaving conversations open indefinitely (context leak)
- Polling too aggressively (wasted context)
- Broadcasting when a targeted message would suffice
- Creating deep message chains (if >3 exchanges needed, consider a direct Task invocation)

## Examples

1. **Code review request** — Worker sends request to reviewer agent, gets LGTM/needs-changes response
2. **Deployment approval** — Worker sends notification to orchestrator, waits for go/no-go
3. **Status broadcast** — Build agent broadcasts "build complete" to all team members

## Integration Points

- **dag-task-graph** — Task completion can trigger notification messages
- **autonomous-task-claiming** — Claim/release events can be broadcast
- **background-job-injection** — Job completion can send a message to the requester
- **team-builder** — Teams can use messaging for coordination beyond synthesis

## Future: MCP Migration Path

When the protocol stabilizes, it can be wrapped as an MCP server with tools: `send_message`, `read_inbox`, `reply_to`, `ack`. This eliminates filesystem dependency and enables remote agent communication.

## Related Skills

- team-builder
- dag-task-graph
- autonomous-task-claiming
- claude-devfleet
- dmux-workflows
