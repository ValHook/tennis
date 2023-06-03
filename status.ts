export class Status {
    static Ok() {
        return new Status(undefined);
    }
    static Error(error: string) {
        return new Status(error);
    }
    ok() {
        return !this.error_;
    }
    error() {
        return this.error_!;
    }
    protected constructor(error: string|undefined) {
        this.error_ = error;
    }
    protected error_?: string
};

export class StatusOr<T> {
    static Ok<U>(object: U) {
        return new StatusOr<U>(Status.Ok(), object);
    }
    static Error<U>(error: string) {
        return new StatusOr<U>(Status.Error(error), undefined);
    }
    ok() {
        return this.status_.ok();
    }
    error() {
        return this.status_.error();
    }
    value() {
        if (!this.ok()) {
            throw new Error(this.error());
        }
        return this.object_!;
    }
    transform<U>(fn: (value: T)=>U) {
        if (this.ok()) {
            return StatusOr.Ok<U>(fn(this.value()));
        } else {
            return StatusOr.Error<U>(this.error());
        }
    }
    protected constructor(status: Status, object: T|undefined) {
        this.status_ = status;
        this.object_ = object;
    }
    protected status_: Status
    protected object_?: T
};