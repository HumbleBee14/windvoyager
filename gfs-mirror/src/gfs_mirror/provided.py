"""The processing stub provided in the task. Kept verbatim — do not edit.

Simulates the real behavior we must tolerate:
  - 10% random "corruption" that raises, returning False
  - 40s work time per file
  - writes a text sentinel to output_proc on success
"""

from __future__ import annotations

import time

import numpy as np


def process_file(input_grib: str, output_proc: str) -> bool:
    corrupted = np.random.choice([True, False], p=[0.1, 0.9])
    try:
        if corrupted:
            raise Exception("Life is hard sometimes")
        print(f"Computing {input_grib} into {output_proc}...")
        with open(output_proc, "w") as f:
            print(f"yum yum yum {input_grib}")
            time.sleep(40)
            print("BEEP BOOP")
            f.write(f"Did some insane math on {input_grib}")
        return True
    except Exception as e:
        print(e)
        return False
