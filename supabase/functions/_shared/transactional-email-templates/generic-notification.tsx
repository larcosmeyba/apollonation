/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Apollo Reborn'

interface Props {
  heading?: string
  message?: string
  ctaUrl?: string
  ctaLabel?: string
}

const GenericNotificationEmail = ({ heading, message, ctaUrl, ctaLabel }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{heading || `An update from ${SITE_NAME}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{heading || `Update from ${SITE_NAME}`}</Heading>
        <Text style={text}>{message || 'You have a new update from your coach.'}</Text>
        {ctaUrl ? (
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={ctaUrl} style={button}>{ctaLabel || 'Open App'}</Button>
          </Section>
        ) : null}
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: GenericNotificationEmail,
  subject: (d: Record<string, any>) => d?.heading || `An update from ${SITE_NAME}`,
  displayName: 'Generic notification',
  previewData: { heading: 'Welcome', message: 'Thanks for joining Apollo Reborn.', ctaUrl: 'https://apolloreborn.com', ctaLabel: 'Open App' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#000000', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#2d2d2d', lineHeight: '1.55', margin: '0 0 20px' }
const button = { backgroundColor: '#000000', color: '#ffffff', padding: '12px 22px', borderRadius: '8px', fontSize: '14px', textDecoration: 'none', fontWeight: 600 }
const footer = { fontSize: '12px', color: '#888888', margin: '32px 0 0' }
