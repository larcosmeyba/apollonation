/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as generic } from './generic-notification.tsx'
import { template as newSignup } from './new-signup-notification.tsx'
import { template as newMessage } from './new-message-notification.tsx'
import { template as supportTicket } from './support-ticket.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'generic-notification': generic,
  'new-signup-notification': newSignup,
  'new-message-notification': newMessage,
  'support-ticket': supportTicket,
}
