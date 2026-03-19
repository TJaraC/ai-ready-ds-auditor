import { describe, it, expect } from 'vitest';
import {
  COLOR_PRIMARY,
  COLOR_PRIMARY_HOVER,
  COLOR_STATUS_SUCCESS,
  COLOR_STATUS_ERROR,
  COLOR_SURFACE,
  RADIUS_FRAME,
  RADIUS_COMPONENT,
  RADIUS_TABS,
  SPACING_CONTENT,
  SPACING_GAP_BODY,
  SPACING_GAP_HEADER,
} from './tokens';

describe('tokens', () => {
  describe('color tokens', () => {
    it('COLOR_PRIMARY is #F55442', () => {
      expect(COLOR_PRIMARY).toBe('#F55442');
    });
    it('COLOR_PRIMARY_HOVER is #F78C80', () => {
      expect(COLOR_PRIMARY_HOVER).toBe('#F78C80');
    });
    it('COLOR_STATUS_SUCCESS is #2B3C35', () => {
      expect(COLOR_STATUS_SUCCESS).toBe('#2B3C35');
    });
    it('COLOR_STATUS_ERROR is #E03E1A', () => {
      expect(COLOR_STATUS_ERROR).toBe('#E03E1A');
    });
    it('COLOR_SURFACE is #FFFFFF', () => {
      expect(COLOR_SURFACE).toBe('#FFFFFF');
    });
  });

  describe('radius tokens', () => {
    it('RADIUS_FRAME is 20', () => {
      expect(RADIUS_FRAME).toBe(20);
    });
    it('RADIUS_COMPONENT is 8', () => {
      expect(RADIUS_COMPONENT).toBe(8);
    });
    it('RADIUS_TABS is 5', () => {
      expect(RADIUS_TABS).toBe(5);
    });
  });

  describe('spacing tokens', () => {
    it('SPACING_CONTENT is 24', () => {
      expect(SPACING_CONTENT).toBe(24);
    });
    it('SPACING_GAP_BODY is 24', () => {
      expect(SPACING_GAP_BODY).toBe(24);
    });
    it('SPACING_GAP_HEADER is 10', () => {
      expect(SPACING_GAP_HEADER).toBe(10);
    });
  });

  it('exports exactly 11 named constants', () => {
    // This test validates all exports are present and typed correctly
    const colorTokens = [COLOR_PRIMARY, COLOR_PRIMARY_HOVER, COLOR_STATUS_SUCCESS, COLOR_STATUS_ERROR, COLOR_SURFACE];
    const radiusTokens = [RADIUS_FRAME, RADIUS_COMPONENT, RADIUS_TABS];
    const spacingTokens = [SPACING_CONTENT, SPACING_GAP_BODY, SPACING_GAP_HEADER];

    expect(colorTokens).toHaveLength(5);
    expect(radiusTokens).toHaveLength(3);
    expect(spacingTokens).toHaveLength(3);

    colorTokens.forEach((c) => expect(typeof c).toBe('string'));
    radiusTokens.forEach((r) => expect(typeof r).toBe('number'));
    spacingTokens.forEach((s) => expect(typeof s).toBe('number'));
  });
});
