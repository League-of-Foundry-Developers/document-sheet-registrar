# extendedJournalSheets

![extendedJournalSheets](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FLeague-of-Foundry-Developers%2Fleague-repo-status%2Fshields-endpoint%2F_extended-journal-sheets.json)

## Purpose

- Replacing the Journal Sheet is difficult to do in a way which is compatible with both Foundry Core and other modules/systems which replace Journal Sheets.
- Styling a particular journal entry (or kind of entry, e.g. from a particular module) is difficult to do in a way which does not conflict with other modules.
- Modules which alter the display of Journal Entries would like a predictable way to do so, which is hard when different modules use different approaches to work around the issues above.

[This issue](https://gitlab.com/foundrynet/foundryvtt/-/issues/4994) outlines a generic request that if implemented would allow Journal (and other document) "sheets" to be registered just like Actor sheets. Our goal with this library is to allow it as a replacement for this missing API.


## API
Once this library is active, it enables the same API that Actor and Item documents use to register and unregister sheets.

### `Journal.registerSheet`

Register a sheet class as a candidate which can be used to display Journal Entries.

```js
/**
 * Register a sheet class as a candidate which can be used to display Journal Entries.
 *
 * @param {string} scope            Provide a unique namespace scope for this sheet
 * @param {Application} sheetClass  A defined Application class used to render the sheet
 * @param {Object} options          Additional options used for sheet registration
 * @param {string} [options.label]          A human readable label for the sheet name, which will be localized
 * @param {string[]} [options.types]        An array of entity types for which this sheet should be used
 * @param {boolean} [options.makeDefault]   Whether to make this sheet the default for provided types
 */
Journal.registerSheet("myModule", SheetApplicationClass, {
	types: ["base"],
	makeDefault: false,
	label: "My Journal Entry sheet"
});
```


### `Journal.unregisterSheet`
Unregister a Journal Entry sheet class, removing it from the list of available Applications to use for Journal Entries.

```js
/**
 * Unregister a Journal Entry sheet class, removing it from the list of available Applications to use for Journal Entries.
 *
 * @param {string} scope            Provide a unique namespace scope for this sheet
 * @param {Application} sheetClass  A defined Application class used to render the sheet
 * @param {Object} [options]          Additional options used for sheet registration
 * @param {string[]} [options.types]             An Array of types for which this sheet should be removed
 */
Journal.unregisterSheet("myModule", SheetApplicationClass, {
	types: ["base"],
});
```

### Setting which sheet your JournalEntry opens with.

The core flag `sheetClass` on the JournalEntry document will establish which registered sheet to use when opening a given Journal Entry.

It can be set in [any of the ways a flag can be set](https://foundryvtt.wiki/en/development/guides/handling-data#flags).
```js
someJournalEntry.setFlag('core', 'sheetClass', 'my-module.MyModuleSheetClassName');
```
