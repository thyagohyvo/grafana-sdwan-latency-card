# 📡 SD-WAN - Latência por Link | Grafana HTML Graphics Card

Card customizado em HTML/CSS/JavaScript para monitoramento de latência SD-WAN no Grafana, utilizando o plugin **HTML Graphics** com dados provenientes do **Zabbix**.

![Status](https://img.shields.io/badge/status-active-brightgreen)
![Grafana](https://img.shields.io/badge/Grafana-HTML%20Graphics-orange)
![Datasource](https://img.shields.io/badge/Datasource-Zabbix-red)
<img width="1598" height="652" alt="image" src="https://github.com/user-attachments/assets/5054d2b8-0d33-49ee-aeba-18ad68f660fb" />


---

## 📋 Visão Geral

O card exibe, em tempo real, métricas de latência de todos os links WAN monitorados de um host, organizados em um grid responsivo. Cada link possui seu próprio painel com:

- **Badge de status** - NORMAL / CRÍTICO com cores dinâmicas
- **KPIs** - Atual, Média, Máx e Mín (em ms)
- **Gráfico de linha** - com área sombreada, threshold visual e pontos de alerta destacados

---

## 🖥️ Preview

> Grid com 6 links monitorados de um host SD-WAN (ex: `NOME-HOST-prod`):

| Link | Interface | Status |
|------|-----------|--------|
| Starlink | internal5 | NORMAL |
| Vivo | wan2 | CRÍTICO |
| Mundivox | wan1 | NORMAL |
| LINK\_INTERNO\_GOOGLE | internal5 | CRÍTICO |
| LINK\_INTERNO\_GOOGLE | wan2 | CRÍTICO |
| LINK\_INTERNO\_GOOGLE | wan1 | NORMAL |

---

## 🗂️ Estrutura do Repositório

```
.
├── README.md
├── html.html          # Estrutura HTML do card
├── css.css            # Estilos do painel e componentes
└── onRender.js        # Lógica de renderização e leitura dos dados do Grafana
```
<img width="1530" height="383" alt="image" src="https://github.com/user-attachments/assets/bff0c8d4-e9a7-496b-b93b-1763ac34b4a5" />

---

## ⚙️ Configuração no Grafana

### Pré-requisitos

- Grafana com plugin **[HTML Graphics](https://grafana.com/grafana/plugins/gapit-htmlgraphics-panel/)** instalado
- Datasource **Zabbix** configurado
- Itens de latência cadastrados no Zabbix com nomenclatura padronizada

### Query (Datasource: Zabbix)

| Campo | Valor |
|-------|-------|
| Query type | Metrics |
| Group | `/.*/` |
| Host | `NOME-HOST` |
| Item tag | - |
| Item | `/Latency.*/` |

> O filtro `/Latency.*/` retorna automaticamente todos os itens de latência do host, sem necessidade de queries adicionais.

### Configuração do Plugin HTML Graphics

1. Adicione um novo painel ao seu dashboard
2. Selecione o tipo **HTML Graphics**
3. Cole o conteúdo de cada arquivo no campo correspondente:
   - `html.html` → campo **HTML**
   - `css.css` → campo **CSS**
   - `onRender.js` → campo **On Render**
4. Configure o datasource como **Zabbix** com a query acima
5. Salve o painel

---

## 🎨 Lógica do Card

### Extração de Dados

O `onRender.js` lê `data.series` retornado pelo Grafana e extrai todas as séries de latência disponíveis. O nome de exibição de cada link é derivado automaticamente do nome do item no Zabbix.

### Status e Threshold

O badge de status é calculado com base na **latência atual** de cada link:

| Condição | Badge |
|----------|-------|
| Latência ≤ threshold | 🟢 NORMAL |
| Latência > threshold | 🔴 CRÍTICO |

O valor do threshold pode ser ajustado diretamente no `onRender.js`.

### Gráfico

Cada mini-gráfico é renderizado via **Canvas API**, com:

- Linha suavizada com preenchimento gradiente
- Linha de threshold tracejada
- Pontos de alerta destacados (quando acima do limite)
- Eixo Y adaptativo ao range de valores da série

---

## 🔧 Personalização

No `onRender.js`, localize o bloco de configuração no topo do arquivo:

```javascript
const THRESHOLD = 55;       // limite de latência em ms
const MAX_POINTS = 60;      // quantidade de pontos exibidos no gráfico
```

As cores de cada link são atribuídas automaticamente em sequência a partir de uma paleta predefinida, mas podem ser customizadas no `css.css`.

---

## 📦 Dependências

| Componente | Versão |
|------------|--------|
| Grafana | ≥ 9.x |
| HTML Graphics Plugin | ≥ 2.x |
| Zabbix Plugin para Grafana | ≥ 4.x |

---

## 📄 Licença

MIT - sinta-se livre para usar, modificar e distribuir.
