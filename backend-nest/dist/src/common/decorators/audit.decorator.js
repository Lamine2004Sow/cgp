"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Audit = exports.AUDIT_TARGET_KEY = exports.AUDIT_ACTION_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.AUDIT_ACTION_KEY = 'audit_action';
exports.AUDIT_TARGET_KEY = 'audit_target';
const Audit = (action, target) => (0, common_1.applyDecorators)((0, common_1.SetMetadata)(exports.AUDIT_ACTION_KEY, action), (0, common_1.SetMetadata)(exports.AUDIT_TARGET_KEY, target));
exports.Audit = Audit;
//# sourceMappingURL=audit.decorator.js.map