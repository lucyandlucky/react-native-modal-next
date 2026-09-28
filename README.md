# react-native-modal-next

A declarative `QModal` API backed by one shared `react-native-modal` host. The
host serializes dialog content on iOS and Android, and keeps the native modal
open while switching between queued dialogs.

## Installation

```sh
yarn add react-native-modal-next react-native-modal
```

Wrap the application once, above the navigation tree:

```tsx
import { QModalProvider } from 'react-native-modal-next';

export function App() {
  return (
    <QModalProvider>
      <AppNavigator />
    </QModalProvider>
  );
}
```

## Usage

```tsx
import { QModal } from 'react-native-modal-next';

function UpgradeDialog({ visible, plan, onClose }) {
  return (
    <QModal
      visible={visible}
      priority={0}
      placement="center"
      animation="fade"
      dismissOnBackdrop
      onRequestClose={onClose}
    >
      <UpgradeContent plan={plan} onClose={onClose} />
    </QModal>
  );
}
```

The caller owns `visible` and sets it to `false` in `onRequestClose`. The host
renders the dialog content; `QModal` itself renders no native modal. Every
dialog in the same provider shares one native host.

| Prop | Default | Meaning |
| --- | --- | --- |
| `visible` | Required | Whether this dialog requests the host |
| `priority` | `0` | Higher values run first and interrupt lower-priority dialogs |
| `interruptible` | `true` | Whether a higher-priority dialog may temporarily replace this one |
| `placement` | `center` | `center` or `bottom` |
| `animation` | `fade` | `fade` or `slide` for transitions between dialog contents |
| `dismissOnBackdrop` | `false` | Request closing when the backdrop is pressed |
| `dismissOnBack` | `true` | Request closing on Android back |
| `backdropOpacity` | `0.35` | Opacity of the shared backdrop |
| `containerStyle` | None | Style of the content wrapper |
| `onRequestClose` | None | Called on permitted backdrop or back actions |

Dialogs with equal priority display in request order. An interrupted dialog
remains requested and resumes after the higher-priority one closes. Its content
may remount, so keep form state outside the dialog content when it must survive
interruption. A secondary dialog should be registered as a sibling `QModal`
with higher priority; mounting it inside the first dialog's content would
unmount it during the switch.

The host uses `react-native-modal` for its first entrance and final exit.
Content transitions run within that host; the native modal stays visible when
switching between dialogs. A new request received during the final native exit
waits for the native dismissal callback before reopening on iOS.

For navigation that must happen after the native host has closed, call
`waitUntilHidden()` while the current dialog is visible, then clear its
`visible` prop:

```tsx
import { useQModalHost } from 'react-native-modal-next';

const { waitUntilHidden } = useQModalHost();

const openNativePage = async () => {
  const hidden = waitUntilHidden();
  setVisible(false);
  await hidden;
  navigateToNativePage();
};
```

The promise resolves when the entire host is hidden. It waits for other
requested dialogs too; clear any requests belonging to the current screen
before leaving it.

Dialog content is rendered at the provider's position in the React tree. Pass
screen-local context values, navigation actions, and form state through props
or callbacks. Modals created internally by third-party components do not join
this host until those components are adapted to render their content through
`QModal`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
