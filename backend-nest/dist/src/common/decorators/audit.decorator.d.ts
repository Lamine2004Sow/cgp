export declare const AUDIT_ACTION_KEY = "audit_action";
export declare const AUDIT_TARGET_KEY = "audit_target";
export declare const Audit: (action: string, target: string) => <TFunction extends Function, Y>(target: TFunction | object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void;
