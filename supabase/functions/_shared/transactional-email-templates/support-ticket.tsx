/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { subject?: string; body?: string; userEmail?: string; severity?: string }

const SupportTicketEmail = ({ subject, body, userEmail, severity }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Support: {subject || 'New ticket'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Support Ticket</Heading>
        <Text style={text}><strong>From:</strong> {userEmail || '—'}</Text>
        <Text style={text}><strong>Severity:</strong> {severity || 'normal'}</Text>
        <Text style={text}><strong>Subject:</strong> {subject || '—'}</Text>
        <Text style={text}>{body || ''}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SupportTicketEmail,
  subject: (d: Record<string, any>) => `[Support] ${d?.subject || 'New ticket'}`,
  displayName: 'Support ticket',
  previewData: { subject: 'Cannot load Messages', body: 'Tab shows error.', userEmail: 'user@example.com', severity: 'high' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#000000', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#2d2d2d', lineHeight: '1.55', margin: '0 0 10px' }
