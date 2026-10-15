# ADR 0002 — Animações de scroll sem biblioteca externa; fontes auto-hospedadas

**Status:** aceito (15/10/2026)

## Contexto

O site precisa de animações controladas pelo scroll (seções fixas, máscara esboço → cor, galeria horizontal). Toda dependência nova exige justificativa (padrão de engenharia, seção 16).

## Opções

| Opção | A favor | Contra |
| --- | --- | --- |
| GSAP + ScrollTrigger | Muito recurso, bem testado | Dependência externa; licença e versão a acompanhar |
| Lenis (scroll suave) | Sensação "premium" no desktop | Muda o scroll nativo; pior no celular e em acessibilidade |
| JavaScript próprio (~150 linhas) + CSS `position: sticky` | Sem dependência, controle total, leve | Menos recursos prontos |

## Decisão

JavaScript próprio: cada cena calcula o progresso do scroll (0 a 1) e escreve a variável CSS `--p`; o CSS faz o resto com `transform`, `opacity`, `clip-path` e `mask`. Scroll nativo.

Fontes Bodoni Moda e Schibsted Grotesk (licença SIL OFL 1.1) auto-hospedadas em `assets/fonts/`, vindas dos pacotes `@fontsource-variable` 5.3.0. Motivo: não depender do servidor do Google e não enviar o IP dos visitantes a terceiros.

## Trade-offs aceitos

Efeitos mais complexos (timelines encadeadas) dão mais trabalho manual.

## Gatilhos para revisitar

Se as cenas passarem de ~8 ou precisarem de sequências encadeadas, reavaliar GSAP.
