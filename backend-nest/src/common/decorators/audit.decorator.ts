import { applyDecorators, SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'audit_action';
export const AUDIT_TARGET_KEY = 'audit_target';

export const Audit = (action: string, target: string) =>
  applyDecorators(
    SetMetadata(AUDIT_ACTION_KEY, action),
    SetMetadata(AUDIT_TARGET_KEY, target),
  );
