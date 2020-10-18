export class NonObjectStateFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = '[redux::anno] NonObjectStateFound';
    Object.setPrototypeOf(this, NonObjectStateFound.prototype);
  }
}

export class DuplicatedModelFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = '[redux::anno] DuplicatedModelFound';
    Object.setPrototypeOf(this, DuplicatedModelFound.prototype);
  }
}

export class ModelNotFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = '[redux::anno] ModelNotFound';
    Object.setPrototypeOf(this, ModelNotFound.prototype);
  }
}

export class InstanceNotFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = '[redux::anno] InstanceNotFound';
    Object.setPrototypeOf(this, InstanceNotFound.prototype);
  }
}

export class InvalidInstanceCreatorParameters extends Error {
  constructor(message: string) {
    super(message);
    this.name = '[redux::anno] InvalidInstanceCreatorParameters';
    Object.setPrototypeOf(this, InvalidInstanceCreatorParameters.prototype);
  }
}

export class CyclicPrototypeInstanceFound extends Error {
  constructor(message: string, public edges: Array<[string, string]>) {
    super(message);
    this.name = '[redux::anno] CyclicPrototypeInstanceFound';
    Object.setPrototypeOf(this, CyclicPrototypeInstanceFound.prototype);
  }
}

export class CannotSetComputedValue extends Error {
  constructor(message: string) {
    super(message);
    this.name = '[redux::anno] CannotSetComputedValue';
    Object.setPrototypeOf(this, CannotSetComputedValue.prototype);
  }
}

export class CyclicWatchedFieldsFound extends Error {
  constructor(message: string, public edges: Array<[string, string]>) {
    super(message);
    this.name = '[redux::anno] CyclicWatchedFieldsFound';
    Object.setPrototypeOf(this, CyclicWatchedFieldsFound.prototype);
  }
}
