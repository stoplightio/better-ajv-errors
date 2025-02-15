import {
  getChildren,
  getErrors,
  getSiblings,
  isAnyOfError,
  isEnumError,
  concatAll,
  notUndefined,
} from './utils';
import {
  AdditionalPropValidationError,
  RequiredValidationError,
  EnumValidationError,
  DefaultValidationError,
  TypeValidationError,
} from './validation-errors/index';
import ErrorMessageError from './validation-errors/error-message';

const JSON_POINTERS_REGEX = /\/[\w$_-]+(\/\d+)?/g;

// Make a tree of errors from ajv errors array
export function makeTree(ajvErrors = []) {
  const root = { children: {} };
  ajvErrors.forEach(ajvError => {
    const { instancePath } = ajvError;

    // `instancePath === ''` is root
    const paths =
      instancePath === '' ? [''] : instancePath.match(JSON_POINTERS_REGEX);
    paths &&
      paths.reduce((obj, path, i) => {
        obj.children[path] = obj.children[path] || { children: {}, errors: [] };
        if (i === paths.length - 1) {
          obj.children[path].errors.push(ajvError);
        }
        return obj.children[path];
      }, root);
  });
  return root;
}

export function filterRedundantErrors(root, parent, key) {
  /**
   * If there is an `anyOf` error that means we have more meaningful errors
   * inside children. So we will just remove all errors from this level.
   *
   * If there are no children, then we don't delete the errors since we should
   * have at least one error to report.
   */
  if (getErrors(root).some(isAnyOfError)) {
    if (Object.keys(root.children).length > 0) {
      delete root.errors;
    }
  }

  /**
   * If all errors are `enum` and siblings have any error then we can safely
   * ignore the node.
   *
   * **CAUTION**
   * Need explicit `root.errors` check because `[].every(fn) === true`
   * https://en.wikipedia.org/wiki/Vacuous_truth#Vacuous_truths_in_mathematics
   */
  if (root.errors && root.errors.length && getErrors(root).every(isEnumError)) {
    if (
      getSiblings(parent)(root)
        // Remove any reference which becomes `undefined` later
        .filter(notUndefined)
        .some(getErrors)
    ) {
      delete parent.children[key];
    }
  }

  Object.entries(root.children).forEach(([key, child]) =>
    filterRedundantErrors(child, root, key),
  );
}

export function createErrorInstances(root, options) {
  const errors = getErrors(root);
  if (errors.length && errors.every(isEnumError)) {
    const uniqueValues = new Set(
      concatAll([])(errors.map(e => e.params.allowedValues)),
    );
    const allowedValues = [...uniqueValues];
    const error = errors[0];
    return [
      new EnumValidationError(
        {
          ...error,
          params: { allowedValues },
        },
        options,
      ),
    ];
  } else {
    return concatAll(
      errors.reduce((ret, error) => {
        switch (error.keyword) {
          case 'additionalProperties':
            return ret.concat(
              new AdditionalPropValidationError(error, options),
            );
          case 'required':
            return ret.concat(new RequiredValidationError(error, options));
          case 'type':
            return ret.concat(new TypeValidationError(error, options));
          case 'errorMessage':
            return ret.concat(new ErrorMessageError(error, options));
          default:
            return ret.concat(new DefaultValidationError(error, options));
        }
      }, []),
    )(getChildren(root).map(child => createErrorInstances(child, options)));
  }
}

export default (ajvErrors, options) => {
  const tree = makeTree(ajvErrors || []);
  filterRedundantErrors(tree);
  return createErrorInstances(tree, options);
};
