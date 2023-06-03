export class Status {
    static Ok() {
        return new Status(undefined);
    }
    static Error(error) {
        return new Status(error);
    }
    ok() {
        return !this.error_;
    }
    error() {
        return this.error_;
    }
    constructor(error) {
        this.error_ = error;
    }
    error_;
}
;
export class StatusOr {
    static Ok(object) {
        return new StatusOr(Status.Ok(), object);
    }
    static Error(error) {
        return new StatusOr(Status.Error(error), undefined);
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
        return this.object_;
    }
    transform(fn) {
        if (this.ok()) {
            return StatusOr.Ok(fn(this.value()));
        }
        else {
            return StatusOr.Error(this.error());
        }
    }
    constructor(status, object) {
        this.status_ = status;
        this.object_ = object;
    }
    status_;
    object_;
}
;
