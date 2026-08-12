# Nexus-Tokens: Generative UI & Design System Governance

> Conceptual exploration demonstrating middle-layer AST validation, Salt Design System token enforcement, and real-time Generative UI rendering for wealth management workflows.

![Nexus Tokens Banner](public/og-image.png)

## Overview
Nexus-Tokens bridges the gap between Large Language Models (LLMs) and enterprise front-end systems. By placing an **AST JSON Schema Validator (AJV Engine)** between AI prompts and the browser DOM, incoming specs are verified against 3-tier Salt Design System tokens, WCAG 2.1 AAA contrast rules, and 4px spatial grid boundaries in **< 2ms**.

## Key Architecture
- **Middle-Layer Governance:** AST Schema validation interceptor preventing raw CSS injections (`additionalProperties: false`).
- **Design System Enforcement:** Maps AI parameters to Salt Design System 3-tier tokens (`--salt-palette-*`, `--salt-content-*`).
- **Generative Canvas:** Contextually filters components based on advisor natural language intent.

## Live Demo
- **Interactive Application:** https://nexus-tokens.lovable.app/
