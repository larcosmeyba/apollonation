
## Fix: Client Messaging Input Hidden Behind Bottom Navigation

### Root Cause

The client messaging page (`DashboardMessages`) renders the chat inside a `fixed inset-0` container, with `DashboardBottomTabs` fixed to the bottom of the screen at `h-16` (64px). The `ChatView`'s message input sits at the very bottom of its flex layout — but it renders **behind** the bottom nav bar because the nav is `fixed` and overlaps everything beneath it.

Clients can see the messages but cannot access the input box to type — it is visually hidden under the navigation tabs.

There is also a secondary issue: `DashboardMessages` renders immediately using `isAdmin = false` (the initial state of `useAdminStatus`) without waiting for the async role check to complete. This can cause a brief flash or incorrect render state. The `loading` flag from `useAdminStatus` is currently ignored.

---

### Changes Required

**File 1: `src/pages/DashboardMessages.tsx`**

Two fixes:

1. Add a `loading` guard — while `useAdminStatus` is still fetching, show a minimal loading state instead of prematurely rendering either the client or admin view.

2. Add bottom padding to the client chat wrapper so the `ChatView` input clears the fixed bottom nav bar. The bottom tabs are `h-16` (64px) plus iPhone safe area inset. The inner `div` wrapping `ChatView` needs `pb-16` (or equivalent) so the input is never hidden.

```tsx
// Current (broken) — no loading guard, input hidden behind bottom nav:
const DashboardMessages = () => {
  const { isAdmin } = useAdminStatus();

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
        ...
        <div className="flex-1 overflow-hidden min-h-0">
          <ChatView partnerId={COACH_USER_ID} showHeader={false} />
        </div>
        <DashboardBottomTabs />
      </div>
    );
  }
  ...
};

// Fixed — waits for loading, and ChatView sits above the bottom tabs:
const DashboardMessages = () => {
  const { isAdmin, loading } = useAdminStatus();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-apollo-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
        {/* Header */}
        ...
        {/* ChatView — flex-1 but ends ABOVE the bottom tabs */}
        <div className="flex-1 overflow-hidden min-h-0 mb-16">
          <ChatView partnerId={COACH_USER_ID} showHeader={false} />
        </div>
        <DashboardBottomTabs />
      </div>
    );
  }

  return <AdminInbox />;
};
```

The key fix is `mb-16` on the `ChatView` wrapper div, which pushes `ChatView`'s layout up by 64px — exactly the height of the bottom nav bar — so the message input is fully visible and tappable.

---

### Summary of Changes

| File | Change |
|---|---|
| `src/pages/DashboardMessages.tsx` | Add `loading` guard from `useAdminStatus`; add `mb-16` to the `ChatView` wrapper so the input clears the fixed bottom nav |

No database changes needed. No new dependencies needed.
