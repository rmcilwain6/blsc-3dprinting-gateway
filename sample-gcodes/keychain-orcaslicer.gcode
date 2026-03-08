; HEADER_BLOCK_START
; estimated printing seconds = 912
; total_layer_count = 58
; filament_type = PLA
; filament_used_mm = 843.21
; filament_used_cm3 = 2.03
; filament_used_g = 2.55
; layer_height = 0.2
; initial_layer_height = 0.2
; nozzle_diameter = 0.4
; bed_temperature = 60
; nozzle_temperature = 200
; HEADER_BLOCK_END
; OrcaSlicer 2.1.1
; model_label = BLSC_Keychain
G28 ; home all axes
G1 Z5 F5000 ; lift nozzle
M104 S200 ; set nozzle temp
M190 S60 ; wait for bed temp
M109 S200 ; wait for nozzle temp
G21 ; millimeters
G90 ; absolute coords
M82 ; absolute extruder
M107 ; fan off
G1 Z0.2 F3000
G1 X80.0 Y80.0 F5000
G92 E0
; --- Layer 1 ---
G1 X120.0 Y80.0 F1800 E2.1
G1 X120.0 Y120.0 E4.2
G1 X80.0 Y120.0 E6.3
G1 X80.0 Y80.0 E8.4
; --- Layer 2 ---
G1 Z0.4 F3000
G1 X80.5 Y80.5 F5000
G1 X119.5 Y80.5 F1800 E10.5
G1 X119.5 Y119.5 E12.6
G1 X80.5 Y119.5 E14.7
G1 X80.5 Y80.5 E16.8
;[... layers 3-57 omitted ...]
; --- Layer 58 ---
G1 Z11.6 F3000
G1 X100.0 Y100.0 F1800 E843.21
M104 S0 ; turn off nozzle heater
M140 S0 ; turn off bed heater
G91 ; relative
G1 Z5 F3000 ; raise Z
G28 X Y ; home X and Y
G90 ; absolute
M84 ; motors off
; END OF PRINT
