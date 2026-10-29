---
class: dgm-centre
---

<div class="dgm-eyebrow">Use case 01 of 07</div>

<div class="dgm-section-title">Onboarding <span class="accent">and access</span></div>

<div class="dgm-actors">Guest</div>

<div class="dgm-cases">Register organisation &middot; Look up organisation by domain &middot; Sign up and verify email &middot; Sign in &middot; Reset password</div>

<!--
USE CASE 01: ONBOARDING AND ACCESS

Two figures follow: the analysis model, which says what the system must
contain to support these use cases, and the design model, which says how it
was built.
-->

---
class: flex flex-col dgm-page
---

# Onboarding and access: analysis model

<div class="dgm-sub">Everything a caller without a session can do: registering an organisation, signing up, signing in and recovering access.</div>

<div class="dgm-figure">
<svg viewBox="0 0 1200 490" fill="none">
<UmlDefs p="a1" />
<UmlActor :x="48" :y="210" label="Guest" sub="no session" />
<line x1="64" y1="196" x2="100" y2="62" stroke="#8a8a8a" stroke-width="1.2" />
<line x1="64" y1="210" x2="100" y2="192" stroke="#8a8a8a" stroke-width="1.2" />
<line x1="64" y1="224" x2="100" y2="347" stroke="#8a8a8a" stroke-width="1.2" />
<UmlClass :x="100" :y="30" :w="232" name="OrganisationRegistrationView" stereotype="boundary" :ops="['submit(orgDetails)']" />
<UmlClass :x="100" :y="145" :w="232" name="SignUpView" stereotype="boundary" :ops="['lookupDomain(email)', 'signUp(username, pwd)', 'verifyEmail(code)']" />
<UmlClass :x="100" :y="300" :w="232" name="SignInView" stereotype="boundary" :ops="['signIn(username, pwd)', 'requestPasswordReset(email)', 'completeReset(code, pwd)']" />
<line x1="332" y1="62" x2="380" y2="65" stroke="#8a8a8a" stroke-width="1.2" />
<line x1="332" y1="192" x2="380" y2="192" stroke="#8a8a8a" stroke-width="1.2" />
<line x1="332" y1="347" x2="380" y2="347" stroke="#8a8a8a" stroke-width="1.2" />
<UmlClass :x="380" :y="25" :w="250" name="OrganisationRegistration" stereotype="control" :ops="['register(details)', 'findByDomain(domain)']" :accent="true" />
<UmlClass :x="380" :y="145" :w="250" name="AccountProvisioning" stereotype="control" :ops="['resolveOrgByEmailDomain()', 'assertOrgApproved()', 'attachUserToOrg()']" :accent="true" />
<UmlClass :x="380" :y="300" :w="250" name="SignInGovernance" stereotype="control" :ops="['checkLockout(username)', 'recordSignInOutcome()', 'clearRestrictionOnReset()']" :accent="true" />
<line x1="630" y1="65" x2="700" y2="80" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a1-open)" />
<line x1="630" y1="170" x2="700" y2="140" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a1-open)" />
<line x1="630" y1="200" x2="700" y2="245" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a1-open)" />
<line x1="630" y1="330" x2="700" y2="290" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a1-open)" />
<line x1="630" y1="360" x2="700" y2="400" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a1-open)" />
<UmlClass :x="700" :y="20" :w="240" name="Organisation" stereotype="entity" :attrs="['name', 'type', 'emailDomain', 'status']" :ops="['isDomainAvailable()', 'mayAcceptMembers()']" />
<UmlClass :x="700" :y="200" :w="240" name="User" stereotype="entity" :attrs="['username', 'email', 'organisation', 'status']" />
<UmlClass :x="700" :y="345" :w="240" name="LoginRestriction" stereotype="entity" :attrs="['username', 'failedAttempts', 'lockedUntil']" :ops="['isLocked(now)', 'registerFailure()']" />
<line x1="740" y1="168" x2="740" y2="200" stroke="#8a8a8a" stroke-width="1.2" />
<text x="746" y="182" style="font-size:9px" fill="#5a5a5a">1</text>
<text x="746" y="198" style="font-size:9px" fill="#5a5a5a">0..*</text>
<text x="775" y="190" style="font-size:9px" fill="#5a5a5a">members</text>
<UmlNote :x="970" :y="20" :w="215" title="domain identity" :lines="['An organisation is identified', 'by its email domain, which', 'must be unique and cannot be', 'a public mail provider.']" />
<UmlNote :x="970" :y="125" :w="215" title="precondition" :lines="['An organisation must be', 'approved before any of its', 'members may sign up, post', 'or claim.']" />
<UmlNote :x="970" :y="230" :w="215" title="one-time attachment" :lines="['A member is attached to the', 'organisation matching their', 'email domain once, on first', 'sign-in, and is never', 'reassigned.']" />
<UmlNote :x="970" :y="350" :w="215" title="lockout" :lines="['Lockout is tracked by the', 'username entered, not the', 'account. A completed', 'password reset clears the', 'failed attempts.']" />
</svg>
</div>

<!--
FIGURE: ONBOARDING AND ACCESS, ANALYSIS MODEL

This use case covers everything a caller without a session can do. The single
actor is a Guest, so every operation reachable from these boundaries is an
unauthenticated one, which is why they are modelled apart from the
administrative use cases that need a privileged role.

Three boundaries divide the work, and the division is forced by the domain
rather than chosen for tidiness. Registering an organisation is separate from
signing up because the first member of an organisation has no account yet, so
the organisation has to exist before any person can be attached to it. Signing
up carries the domain lookup that decides whether sign-up may proceed, must
wait for a review, or requires the organisation to be registered first. Signing
in is separate again because it carries recovery, and because its failures are
tracked against something that may not be an account at all.

Responsibilities follow information proximity: the object holding the data
needed for a decision makes the decision. Organisation knows its own domain and
status, so it decides whether a domain may be claimed and whether it may accept
new members. User is a knowing object with no decisions of its own.

LoginRestriction is deliberately a separate entity rather than fields on User.
Lockout is tracked against the username that was typed, which may not resolve
to any existing account, so the restriction cannot belong to a User that might
not exist. Keeping it separate is also what lets a completed password reset
clear the accumulated failures without touching the account record.

The precondition note is the one that shapes the whole platform. Organisation
approval is checked before an account is created, not applied as a restriction
on an account that already exists, so an unapproved organisation has no members
at all rather than members who cannot act.
-->

---
class: flex flex-col dgm-page
---

# Onboarding and access: design model

<div class="dgm-sub">Where the credential lives, and what the profile service actually owns.</div>

<div class="dgm-figure">
<svg viewBox="0 0 1200 495" fill="none">
<UmlDefs p="d1" />
<UmlClass :x="40" :y="20" :w="240" name="Platform web app" stereotype="client" :ops="['signUpWithCognito()', 'signInWithCognito()', 'resetPassword()']" />
<UmlClass :x="40" :y="150" :w="240" name="ProfileClient" stereotype="sdk" :ops="['registerOrg(details)', 'lookupOrgByDomain(email)', 'loginStatus(username)', 'loginOutcome(result)']" />
<UmlClass :x="40" :y="300" :w="240" name="Amazon Cognito" stereotype="identity provider" :ops="['signUp(email, pwd)', 'confirmSignUp(code)', 'initiateAuth()', 'forgotPassword()']" :muted="true" />
<line x1="160" y1="115" x2="160" y2="150" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d1-open)" />
<text x="167" y="140" style="font-size:8.5px" fill="#5a5a5a">«use»</text>
<path d="M40 70 H14 V355 H40" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" fill="none" marker-end="url(#d1-open)" />
<text transform="rotate(-90 22 215)" x="22" y="215" text-anchor="middle" style="font-size:8.5px" fill="#5a5a5a">«use» the credential flow</text>
<line x1="280" y1="205" x2="330" y2="100" stroke="#1f6b45" stroke-width="1.3" marker-end="url(#d1-arr)" />
<text x="287" y="160" style="font-size:8.5px" fill="#5a5a5a">HTTPS</text>
<UmlClass :x="330" :y="30" :w="265" name="api (public routes)" stereotype="handler" :ops="['registerOrg()', 'lookupOrg()', 'loginStatus()', 'loginOutcome()', 'passwordResetCompleted()', 'getMe()']" :accent="true" />
<UmlClass :x="330" :y="230" :w="265" name="store.Store" stereotype="transaction script" :ops="['RecordLoginSuccess(...)', 'RecordLoginFailure(...)', 'ClearLoginRestriction(...)']" :accent="true" />
<line x1="462" y1="170" x2="462" y2="230" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d1-open)" />
<text x="469" y="205" style="font-size:8.5px" fill="#5a5a5a">«use»</text>
<UmlClass :x="650" :y="25" :w="255" name="store.Organisations" stereotype="repository" :ops="['Create(o)', 'GetByDomain(dom)', 'GetByID(id)']" />
<UmlClass :x="650" :y="150" :w="255" name="store.Users" stereotype="repository" :ops="['UpsertBySub(sub, ...)', 'ResolveLoginSubject(id)', 'IsSuspended(identifier)', 'GetBySub(sub)']" />
<UmlClass :x="650" :y="290" :w="255" name="store.LoginRestrictions" stereotype="repository" :ops="['Check(username)', 'RecordFailure(...)', 'RecordSuccess(username)']" />
<line x1="595" y1="80" x2="650" y2="65" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d1-open)" />
<line x1="595" y1="120" x2="650" y2="190" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d1-open)" />
<line x1="595" y1="260" x2="650" y2="230" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d1-open)" />
<line x1="595" y1="290" x2="650" y2="330" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d1-open)" />
<UmlClass :x="945" :y="25" :w="240" name="domain.Organisation" stereotype="entity" :attrs="['Name, Type, Status', 'Domain, ContactEmail']" :ops="['EmailDomain(email)']" />
<UmlClass :x="945" :y="160" :w="240" name="domain.User" stereotype="entity" :attrs="['CognitoSub, Username', 'Email, OrgID, Status']" />
<line x1="905" y1="70" x2="945" y2="75" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#d1-open)" />
<line x1="905" y1="200" x2="945" y2="200" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#d1-open)" />
<UmlNote :x="945" :y="275" :w="240" title="credential boundary" :lines="['Cognito holds the password.', 'The profile service never', 'sees it: it records the', 'sign-in outcome and owns the', 'lockout that follows.']" />
<UmlNote :x="945" :y="395" :w="240" title="reserved domains" :lines="['A public mail provider such', 'as gmail or outlook cannot', 'be claimed as an', 'organisation domain.']" />
</svg>
</div>

<!--
FIGURE: ONBOARDING AND ACCESS, DESIGN MODEL

The design model shows a split that the analysis model deliberately left open:
who holds the credential. The answer is that RescuFood does not. Amazon Cognito
owns the user pool, the password, the email verification code and the reset
flow, and the platform web app talks to it directly. The profile service never
receives a password at all.

What the profile service does own is everything Cognito cannot know about.
Cognito has no concept of an organisation, so the service holds the
organisation record, resolves a new member to an organisation by email domain,
and refuses the attachment when that organisation is not approved. Cognito also
has no concept of our lockout policy, so the client reports the outcome of each
sign-in attempt and the service records it.

That reporting is why loginStatus and loginOutcome exist as routes rather than
being implied by a sign-in call. The sequence is: the client asks whether this
username is currently locked, attempts the Cognito sign-in, then reports back
what happened. store.Store.RecordLoginFailure increments the count and locks
the username once the threshold is crossed; RecordLoginSuccess clears it, as
does a completed password reset.

UpsertBySub is the join between the two systems. On first sign-in the Cognito
subject identifier arrives with the token, the service inserts the user row,
resolves the organisation from the email domain and records the attachment
once. Every later sign-in finds the existing row, which is what makes the
attachment permanent without any explicit guard.

The three repositories follow the same rule as the rest of the system: they
hold the SQL and nothing else, and the domain types hold the rules.
-->
