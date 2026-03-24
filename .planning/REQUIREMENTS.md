# Requirements: AI-Ready Design System Auditor

**Defined:** 2026-03-20
**Milestone:** v2.1 — Usability & Performance
**Core Value:** Any Non-Enterprise Figma user can connect their Design System to a local AI IDE in under 5 minutes, get live sync, and give the AI full structured context — for free.

## v2.1 Requirements

### PERF — Rendimiento

- [x] **PERF-01**: El plugin completa el audit en design systems con 500+ componentes sin congelarse
- [x] **PERF-02**: El modo "Scan Only" omite el export de SVGs, eliminando trabajo innecesario (los SVGs se descartan en START_SCAN)

### SCOPE — Configurabilidad del Audit

- [x] **SCOPE-01**: El usuario puede activar/desactivar cada categoría de audit (colores, tipografía, spacing, borders, disconnected components) desde la Config View
- [x] **SCOPE-02**: El audit solo ejecuta las categorías habilitadas — las desactivadas son completamente omitidas
- [ ] **SCOPE-03**: La configuración de scope persiste entre sesiones del plugin via `setPluginData`

### UX — Primera Experiencia

- [ ] **UX-01**: En el primer uso (sin datos inyectados y sin config previa), el dashboard muestra un estado específico que invita al usuario a configurar el scope antes de escanear
- [ ] **UX-02**: El CTA del estado de primer uso navega directamente al usuario a la pestaña Config

### ICON — Detección y Auditoría de Iconos

- [ ] **ICON-01**: El plugin detecta nodos icono por patrón de nombre (`icon/`, `Icon/`, `ic_`, `icons/`, etc.) — detección con alta confianza, sin falsos positivos
- [ ] **ICON-02**: El plugin detecta nodos icono por fuente (fontFamily = `Material Icons`, `Font Awesome`, `Ionicons`, etc.) — detección de icon fonts
- [ ] **ICON-03**: El plugin detecta iconos vectoriales desconectados: frames cuadrados pequeños (16–48 px) que contienen solo paths y NO son instancias de componente
- [ ] **ICON-04**: El audit reporta inconsistencias de tamaño — iconos fuera de la escala estándar (16, 20, 24, 32, 40, 48 px)
- [ ] **ICON-05**: El audit reporta iconos con fills hardcodeados que deberían usar variables de color
- [x] **ICON-06**: La categoría `icons` aparece como toggle en el Audit Scope de ConfigView, deshabilitada por defecto
- [x] **ICON-07**: Con el toggle de icons deshabilitado, cero nodos icono se procesan — previene data bloat en archivos con cientos de iconos
- [x] **ICON-08**: El servidor MCP expone los resultados del audit de iconos en el schema de respuesta

## Future Requirements (v3.0+)

### Lookup

- **CMLK-01**: Component lookup UI panel — buscar specs por nombre en el plugin UI
- **CMLK-02**: SVG asset browser — buscar y previsualizar SVGs por nombre en el plugin UI
- **CMLK-03**: fileKey auto-populated en MCP config snippet cuando el report está disponible

## Out of Scope

| Feature | Reason |
|---------|--------|
| Umbral de frecuencia (smart filter) | Más complejo, los toggles por categoría cubren el 80% del problema |
| Agrupación de issues por valor | Útil pero no crítico para v2.1 — deferred |
| Cap de componentes para SVG export | El batching de 5 paralelos ya resuelve el problema de rendimiento |
| Filtros por página de Figma | Scope demasiado grande para v2.1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PERF-01 | Phase 14 | Complete |
| PERF-02 | Phase 14 | Complete |
| SCOPE-01 | Phase 14 | Complete |
| SCOPE-02 | Phase 14 | Complete |
| SCOPE-03 | Phase 14 | Pending |
| UX-01 | Phase 14 | Pending |
| UX-02 | Phase 14 | Pending |
| ICON-01 | Phase 15 | Pending |
| ICON-02 | Phase 15 | Pending |
| ICON-03 | Phase 15 | Pending |
| ICON-04 | Phase 15 | Pending |
| ICON-05 | Phase 15 | Pending |
| ICON-06 | Phase 15 | Complete |
| ICON-07 | Phase 15 | Complete |
| ICON-08 | Phase 15 | Complete |

**Coverage:**
- v2.1 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after v2.1 milestone start*
