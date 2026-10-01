# SubNetPlanner

A dependency-free, offline IPv4 VLSM planner and companion to [SubNetCalc](https://github.com/JohnB-LWF/SubNetCalc). Open `index.html` directly in a browser. No install, build, account, backend, external assets, or network requests are needed. Keep the HTML, CSS, and three JavaScript files together.

Enter a parent CIDR and named usable-host requirements, then choose **Plan subnets**. Example data is provided for replacement. Input changes hide previous results until recalculation. All information stays in the page; reloading restores the example.

Allocations use the smallest power-of-two block with at least hosts + 2 addresses, never smaller than /30. Larger requirements allocate first, with stable input-order ties. Results display in input order. Parents are normalized and insufficient capacity fails the entire plan. IPv4 helpers and styling are adapted from the local SubNetCalc companion; shared /31 and /32 semantics remain intact.

## Tests

With Node.js installed:

```
node --test tests/*.test.cjs
```

`ipv4.js` holds the shared address helpers; `planner.js` contains browser-independent planning logic; `app.js` manages form validation and rendering. No runtime dependencies.

## Browser checks

Automated calculation tests pass. Manual browser checks below remain unverified: the available browser tool blocked the local `file://` preview.

- Calculate the example /24: 112 assigned, 144 remaining, allocations /26, /27, /28.
- Set parent to /26: capacity error, no partial results, entered requirements retained.
- Edit a calculated input: results hide and status requests recalculation.
- Tab through inputs, Add subnet, Remove, Plan subnets, and the scrollable result table; submit with Enter.
- Check at a 375px viewport: stacked controls and contained horizontal table scrolling.
- Enable reduced motion: no animated result access or transitions.

Calculations describe address arithmetic, not real-world availability or reachability.
