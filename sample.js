function capitalizeWords(value) {
  if (Array.isArray(value)) {
    return value.map(
      (string) => `${string.charAt(0).toUpperCase()}${string.slice(1)}`
    );
  } else if (/string/i.test(typeof value) && value.length) {
    return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
  } else return null;
}
