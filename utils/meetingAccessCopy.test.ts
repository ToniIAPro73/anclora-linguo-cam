import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('meeting access card copy', () => {
  const source = fs.readFileSync('App.tsx', 'utf8');

  it('uses meeting-oriented Spanish and English CTA labels', () => {
    expect(source).toContain("enterWorkspace: 'Unirse a la reunión'");
    expect(source).toContain("enterWorkspace: 'Join meeting'");
  });

  it('does not expose workspace wording in access CTA labels', () => {
    expect(source).not.toContain("enterWorkspace: 'Entrar al workspace'");
    expect(source).not.toContain("enterWorkspace: 'Enter workspace'");
  });
});
