"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThrottleGuard = void 0;
const common_1 = require("@nestjs/common");
let ThrottleGuard = class ThrottleGuard {
    store = new Map();
    DEFAULT_LIMIT = 60;
    DEFAULT_TTL_MS = 60_000;
    STRICT_LIMIT = 10;
    STRICT_PATHS = ['/api/imports'];
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const ip = (request.ip || request.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
        const path = request.path || '';
        const isStrict = this.STRICT_PATHS.some((p) => path.startsWith(p));
        const limit = isStrict ? this.STRICT_LIMIT : this.DEFAULT_LIMIT;
        const ttl = this.DEFAULT_TTL_MS;
        const key = `${ip}:${isStrict ? 'strict' : 'default'}`;
        const now = Date.now();
        let record = this.store.get(key);
        if (!record || now > record.resetAt) {
            record = { count: 1, resetAt: now + ttl };
            this.store.set(key, record);
            this.cleanup(now);
            return true;
        }
        record.count += 1;
        if (record.count > limit) {
            throw new common_1.HttpException({ message: 'Trop de requêtes, veuillez réessayer dans quelques instants.', statusCode: 429 }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        return true;
    }
    cleanup(now) {
        if (this.store.size > 1000) {
            for (const [key, record] of this.store.entries()) {
                if (now > record.resetAt) {
                    this.store.delete(key);
                }
            }
        }
    }
};
exports.ThrottleGuard = ThrottleGuard;
exports.ThrottleGuard = ThrottleGuard = __decorate([
    (0, common_1.Injectable)()
], ThrottleGuard);
//# sourceMappingURL=throttle.guard.js.map