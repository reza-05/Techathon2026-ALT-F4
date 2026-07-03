# Representative Room Circuit - Wokwi

This simulation models one room with two fans and three lights. The full office
repeats this five-channel design in each of its three rooms.

## What the simulation demonstrates

- Five wall-state switches are read by an ESP32.
- Five isolated relay channels are driven by separate ESP32 GPIO pins.
- Three warm-white LEDs represent the three light loads.
- Two blue LEDs represent the low-voltage relay outputs for Fan 1 and Fan 2.
- Firmware calculates the realistic room load: 60W per fan and 15W per light.
- A JSON telemetry snapshot is printed every second for a future MQTT/HTTP bridge.

The LEDs intentionally keep the browser simulation low voltage. In a physical
installation, each fan indicator is replaced by a properly rated contactor or
relay controlling the fan circuit. **Never connect mains voltage directly to an
ESP32, breadboard, or hobby relay without qualified electrical supervision.**

## Run it

1. Create a new ESP32 project at [Wokwi](https://wokwi.com/).
2. Replace its `diagram.json` and `sketch.ino` with the files in this directory.
3. Start the simulation.
4. Move any of the five labelled switches.
5. Observe the corresponding relay/load indicator and Serial Monitor JSON.

## Pin map

| Channel | State input | Relay output | Rated load |
|---|---:|---:|---:|
| Fan 1 | GPIO 21 | GPIO 25 | 60W |
| Fan 2 | GPIO 22 | GPIO 26 | 60W |
| Light 1 | GPIO 23 | GPIO 27 | 15W |
| Light 2 | GPIO 18 | GPIO 32 | 15W |
| Light 3 | GPIO 19 | GPIO 33 | 15W |

Each SPDT switch connects its GPIO to either 3.3V (OFF) or GND (ON), avoiding a
floating input. Relay modules use separate 5V power and share logic ground with
the ESP32. Relay contacts provide galvanic separation between control logic and
the representative load circuit.

