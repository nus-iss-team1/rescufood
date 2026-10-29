---
class: dgm-centre
---

<div class="dgm-eyebrow">Use case 02 of 07</div>

<div class="dgm-section-title">Platform <span class="accent">administration</span></div>

<div class="dgm-actors">Platform administrator</div>

<div class="dgm-cases">Approve organisation &middot; Reject or suspend organisation &middot; Suspend or reactivate user &middot; Unlock a locked account &middot; Read the audit log</div>

<!--
USE CASE 02: PLATFORM ADMINISTRATION

Two figures follow: the analysis model, which says what the system must
contain to support these use cases, and the design model, which says how it
was built.
-->

---
class: flex flex-col dgm-page
---

# Platform administration: analysis model

<div class="dgm-sub">The five administrative use cases, four that change state and one that does not.</div>

<div class="dgm-figure">
<svg viewBox="0 0 1200 530" fill="none">
<UmlDefs p="a2" />
<UmlActor :x="48" :y="230" label="Platform" sub="administrator" />
<line x1="64" y1="216" x2="100" y2="85" stroke="#8a8a8a" stroke-width="1.2" />
<line x1="64" y1="230" x2="100" y2="237" stroke="#8a8a8a" stroke-width="1.2" />
<line x1="64" y1="244" x2="100" y2="367" stroke="#8a8a8a" stroke-width="1.2" />
<UmlClass :x="100" :y="30" :w="240" name="OrganisationReviewScreen" stereotype="boundary" :ops="['listPending()', 'approve(id, reason)', 'reject(id, reason)', 'suspend(id, reason)']" />
<UmlClass :x="100" :y="190" :w="240" name="MemberAdminScreen" stereotype="boundary" :ops="['suspendUser(id, reason)', 'reactivateUser(id, reason)', 'unlock(username)']" />
<UmlClass :x="100" :y="335" :w="240" name="AuditLogScreen" stereotype="boundary" :ops="['readAuditLog(filters)']" />
<line x1="340" y1="85" x2="390" y2="80" stroke="#8a8a8a" stroke-width="1.2" />
<line x1="340" y1="237" x2="390" y2="237" stroke="#8a8a8a" stroke-width="1.2" />
<line x1="340" y1="367" x2="390" y2="370" stroke="#8a8a8a" stroke-width="1.2" />
<UmlClass :x="390" :y="25" :w="255" name="OrgStatusTransition" stereotype="control" :ops="['assertTransitionLegal()', 'applyStatus(reason)', 'recordAudit()', 'notifyContact()']" :accent="true" />
<UmlClass :x="390" :y="190" :w="255" name="MemberStatusTransition" stereotype="control" :ops="['applyUserStatus(reason)', 'clearLockout(username)', 'recordAudit()']" :accent="true" />
<UmlClass :x="390" :y="330" :w="255" name="AuditEnquiry" stereotype="control" :ops="['list(filters)', 'resolveActorNames()']" :accent="true" />
<line x1="645" y1="80" x2="705" y2="85" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a2-open)" />
<line x1="645" y1="120" x2="705" y2="450" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a2-open)" />
<line x1="645" y1="220" x2="705" y2="230" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a2-open)" />
<line x1="645" y1="255" x2="705" y2="340" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a2-open)" />
<line x1="645" y1="270" x2="705" y2="470" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a2-open)" />
<line x1="645" y1="380" x2="705" y2="460" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a2-open)" />
<UmlClass :x="705" :y="20" :w="240" name="Organisation" stereotype="entity" :attrs="['status', 'contactEmail']" :ops="['approve()', 'reject()', 'suspend()']" />
<UmlClass :x="705" :y="185" :w="240" name="User" stereotype="entity" :attrs="['status', 'isAdmin', 'organisation']" />
<UmlClass :x="705" :y="310" :w="240" name="LoginRestriction" stereotype="entity" :attrs="['username', 'lockedUntil']" />
<UmlClass :x="705" :y="420" :w="240" name="AuditEntry" stereotype="entity" :attrs="['actor, action', 'entity, reason', 'at']" />
<UmlNote :x="975" :y="20" :w="210" title="mandatory reason" :lines="['No administrative state', 'change is accepted without a', 'reason, and the reason is', 'stored with the change.']" />
<UmlNote :x="975" :y="130" :w="210" title="cascade" :lines="['Suspending an organisation', 'withdraws access for every', 'one of its members at once,', 'approved or not.']" />
<UmlNote :x="975" :y="240" :w="210" title="append only" :lines="['AuditEntry is immutable. A', 'database trigger rejects', 'updates and deletes on the', 'audit log.']" />
<UmlNote :x="975" :y="350" :w="210" title="read only" :lines="['Reading the audit log is the', 'only administrative use case', 'that changes nothing, so it', 'needs no reason.']" />
</svg>
</div>

<!--
FIGURE: PLATFORM ADMINISTRATION, ANALYSIS MODEL

The Platform administrator is the only privileged role in the system and works
through a separate console, so the administrative use cases are modelled apart
from the guest ones. There are five: four that change state and one, reading
the audit log, that does not.

Approving an organisation is the foundational gatekeeper. Until it happens no
accounts can be created for that organisation and no member can post or claim,
which is why the organisation review screen is the first thing in the console.
Rejection and suspension are the alternative outcomes of the same review, and
suspension applies equally to an organisation that was previously approved,
withdrawing access from all of its members at once.

Member administration works at the individual level instead, for the case where
one person needs action rather than the whole body. Unlocking is grouped here
rather than with sign-in because it is an administrative override of the
lockout, not part of the sign-in flow itself.

Two modelling decisions are worth defending. The first is that the transition
operations live on Organisation rather than on the control class. Organisation
knows its own status, so it is the object that can say whether a move to
approved, rejected or suspended is legal; the control class only applies the
decision and records it. The second is that AuditEntry is an entity with no
operations at all. It is written once and never changed, and that immutability
is enforced below the application by a database trigger that rejects updates
and deletes on the audit log, so the property holds even against code that
tries to violate it.

The mandatory reason is what ties the two together. Every state change carries
one, and the change and its reason are stored together, so the audit log can
always answer not just what happened but why.
-->

---
class: flex flex-col dgm-page
---

# Platform administration: design model

<div class="dgm-sub">One shared transition handler, and the transaction that makes the reason mandatory.</div>

<div class="dgm-figure">
<svg viewBox="0 0 1200 500" fill="none">
<UmlDefs p="d2" />
<UmlClass :x="40" :y="30" :w="245" name="ProfileClient" stereotype="sdk · admin console" :ops="['approveOrg(id, reason)', 'rejectOrSuspendOrg(...)', 'setUserStatus(id, reason)', 'unlockUser(username)', 'listAuditLog(filters)']" />
<UmlClass :x="40" :y="230" :w="245" name="api.middleware" stereotype="middleware" :ops="['validateCognitoToken()', 'requireAdminClaim()']" />
<UmlClass :x="330" :y="30" :w="265" name="api/admin" stereotype="handler" :ops="['transitionOrg(action, fn)', 'transitionUser(action, st)', 'unlockUser()', 'listOrgs() · countOrgs()', 'listUsers() · userNames()', 'listAuditLog()']" :accent="true" />
<UmlClass :x="330" :y="230" :w="265" name="store.Store" stereotype="transaction script" :ops="['inTx(fn)', 'SetOrgStatus(org, entry)', 'SetUserStatus(id, st, entry)', 'ClearLoginRestriction(...)']" :accent="true" />
<UmlClass :x="40" :y="400" :w="255" name="notify.SQSPublisher" stereotype="publisher" :ops="['SendOrgApproved(to, org)']" />
<line x1="285" y1="95" x2="330" y2="90" stroke="#1f6b45" stroke-width="1.3" marker-end="url(#d2-arr)" />
<text x="287" y="86" style="font-size:8.5px" fill="#5a5a5a">HTTPS</text>
<line x1="330" y1="140" x2="285" y2="255" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d2-open)" />
<text x="299" y="200" style="font-size:8.5px" fill="#5a5a5a">«use»</text>
<line x1="462" y1="170" x2="462" y2="230" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d2-open)" />
<text x="469" y="205" style="font-size:8.5px" fill="#5a5a5a">«use»</text>
<line x1="335" y1="170" x2="292" y2="400" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d2-open)" />
<text x="315" y="330" text-anchor="end" style="font-size:8.5px" fill="#5a5a5a">«publish» after the transaction commits</text>
<UmlClass :x="650" :y="20" :w="250" name="store.Organisations" stereotype="repository" :ops="['UpdateStatus(o)', 'List(status)', 'CountByStatus()']" />
<UmlClass :x="650" :y="140" :w="250" name="store.Users" stereotype="repository" :ops="['UpdateStatus(id, status)', 'ListByOrg(orgID)', 'NamesByIDs(ids)']" />
<UmlClass :x="650" :y="260" :w="250" name="store.AuditEvents" stereotype="repository" :ops="['Record(entry)']" />
<UmlClass :x="650" :y="350" :w="250" name="store.LoginRestrictions" stereotype="repository" :ops="['AdminUnlock(username)', 'GetLockedUntil(usernames)']" />
<line x1="595" y1="80" x2="650" y2="55" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d2-open)" />
<line x1="595" y1="110" x2="650" y2="165" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d2-open)" />
<line x1="595" y1="255" x2="650" y2="95" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d2-open)" />
<line x1="595" y1="270" x2="650" y2="195" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d2-open)" />
<line x1="595" y1="290" x2="650" y2="290" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d2-open)" />
<line x1="595" y1="320" x2="650" y2="385" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d2-open)" />
<UmlClass :x="945" :y="20" :w="240" name="domain.Organisation" stereotype="entity" :attrs="['Status']" :ops="['Approve()', 'Reject()', 'Suspend()']" />
<UmlClass :x="945" :y="165" :w="240" name="domain.AuditEntry" stereotype="entity" :attrs="['Actor, Action, Entity', 'Reason, At']" />
<line x1="900" y1="60" x2="945" y2="65" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#d2-open)" />
<line x1="900" y1="285" x2="945" y2="215" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#d2-open)" />
<UmlNote :x="945" :y="280" :w="240" title="one transaction" :lines="['SetOrgStatus writes the', 'status change and its', 'mandatory audit entry inside', 'one transaction, so neither', 'can exist without the other.']" />
<UmlNote :x="945" :y="400" :w="240" title="append only" :lines="['A database trigger on', 'audit_log rejects updates', 'and deletes, so a recorded', 'change cannot be rewritten.']" />
</svg>
</div>

<!--
FIGURE: PLATFORM ADMINISTRATION, DESIGN MODEL

Three things in this diagram are worth pointing at, because each one is a
design decision rather than a mechanical translation of the analysis model.

The first is the middleware. Every route under the admin prefix requires a
validated Cognito token that carries an admin claim. Checking the claim rather
than merely the presence of a token is the distinction that matters:
authentication establishes who the caller is, not what they are allowed to do.
Because the check is middleware rather than a line in each handler, a new admin
route inherits it instead of relying on someone remembering.

The second is transitionOrg. Rather than three near-identical handlers for
approve, reject and suspend, there is one handler that takes the domain
transition itself as a function, along with the audit action to record and an
optional notification to send. That is the Strategy pattern applied to Go
functions, and it is what keeps the authorisation, the reason validation and
the audit write in one place rather than copied three times.

The third is store.Store, which is where the mandatory reason stops being a
convention and becomes a guarantee. SetOrgStatus opens a transaction, calls
Organisations.UpdateStatus and AuditEvents.Record inside it, and commits both
or neither. An administrator therefore cannot approve an organisation without
recording why, because the two writes are the same write. Below that, a trigger
on audit_log rejects updates and deletes, so what was recorded cannot later be
rewritten.

The notification sits outside the transaction. The approval is committed first
and the message published afterwards, which is the trade-off recorded for the
whole system: if the queue is unavailable at that moment the email is lost,
which we accepted because a missing email is a lesser failure than a
rolled-back approval.
-->
