/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { senderName?: string; preview?: string; ctaUrl?: string }

const NewMessageEmail = ({ senderName, preview, ctaUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{senderName ? `New message from ${senderName}` : 'You have a new message'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{senderName ? `Message from ${senderName}` : 'New message'}</Heading>
        {preview ? <Text style={text}>"{preview}"</Text> : null}
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={ctaUrl || 'https://apolloreborn.com'} style={button}>Open Messages</Button>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewMessageEmail,
  subject: (d: Record<string, any>) => d?.senderName ? `New message from ${d.senderName}` : 'You have a new message',
  displayName: 'New coach message',
  previewData: { senderName: 'Coach Marcos', preview: 'Great work on today\'s session!', ctaUrl: 'https://apolloreborn.com' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#000000', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#2d2d2d', lineHeight: '1.55', margin: '0 0 12px', fontStyle: 'italic' }
const button = { backgroundColor: '#000000', color: '#ffffff', padding: '12px 22px', borderRadius: '8px', fontSize: '14px', textDecoration: 'none', fontWeight: 600 }
