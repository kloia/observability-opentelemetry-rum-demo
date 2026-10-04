# 2. One import in the Angular entry point (`overlay/frontend/src/main.ts`)

**Before** (upstream, line 6 onward):

```ts
 * SPDX-License-Identifier: MIT
 */

import { enableProdMode, importProvidersFrom, provideZoneChangeDetection } from '@angular/core'
```

**After:**

```ts
 * SPDX-License-Identifier: MIT
 */

// Imported first: DocumentLoadInstrumentation must be registered before window load fires.
import './tracer'

import { enableProdMode, importProvidersFrom, provideZoneChangeDetection } from '@angular/core'
```

**Why first:** the document-load instrumentation reads the browser's navigation timing when
the `load` event fires. Register it after the app has booted and that event has already
gone by: you get click and fetch spans, but no page-load span, and no error telling you why.

Back to the [index](README.md).
