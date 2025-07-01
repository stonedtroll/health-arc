# Health Arc

A Foundry VTT module that visually displays dynamic arcs around tokens to represent current hit points and temporary hit points.

<br> 
<p align="center">
  <img src="images/health-arc-demo.png" alt="Health Arc Demo">
</p>
<br> 

## Features

- **HP Arc**: A coloured arc appears around each token to indicate its current HP.
- **Temp HP Arc**: A separate arc is shown for any temporary hit points.
- **Visibility for Non-Owners**: Players who do not own the token and non-GMs will see a "fuzzed" HP arc. The level of uncertainty decreases with higher passive perception.
- **Fade Out Effect**: When tokens are not in combat, not hovered over, or not selected, their health arcs fade out for a cleaner display.
- **Colour Customisation**: Fully customise the colours used for the health arcs, including high HP, low HP, temporary HP, and background arc.
- **Perception-Based Settings**: Configure how perception affects the uncertainty of HP display for non-owned tokens.
- **Intelligent Batching**: Optimized rendering with prioritized token updates to ensure smooth performance even with many tokens.
- **Performance Monitoring**: Built-in performance monitoring tools for advanced debugging.
- **Flexible Logging System**: Advanced debug logging with separate log levels for debug and normal operation modes.
- **Internationalisation**: Supports multiple languages, with Australian English :)available out of the box.
