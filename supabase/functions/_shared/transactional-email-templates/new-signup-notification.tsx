/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { email?: string; tier?: string }

const NewSignupEmail = ({ email, tier }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New signup on Apollo Reborn™</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New Signup 🎉</Heading>
        <Text style={text}><strong>Email:</strong> {email || '—'}</Text>
        <Text style={text}><strong>Tier:</strong> {tier || 'Free'}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewSignupEmail,
  subject: 'New Apollo Reborn™ signup',
  displayName: 'New signup notification',
  previewData: { email: 'user@example.com', tier: 'Apollo Elite™' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#000000', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#2d2d2d', lineHeight: '1.55', margin: '0 0 12px' }
