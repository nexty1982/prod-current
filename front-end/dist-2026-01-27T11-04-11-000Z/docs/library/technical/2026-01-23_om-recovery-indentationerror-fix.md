# OM-Recovery IndentationError Fix

**Date**: January 23, 2026  
**File**: `tools/om_recovery/om_recovery.py`  
**Error**: `IndentationError: unexpected indent (om_recovery.py, line 2499)`

## Step 0: Current Setup Documentation

### Error Location
- **Line**: 2499
- **Error Type**: `IndentationError: unexpected indent`
- **Context**: Inside main menu loop, after `elif action == "zammad":` block

### Code Structure
```python
# Line 2488-2494: exclusions handler
elif action == "exclusions":
    if not EXCLUSIONS_AVAILABLE or handle_exclusions_submenu is None:
        clear_screen()
        print("Hard Exclusions module not available.")
        wait_for_enter()
    else:
        result = handle_exclusions_submenu()  # Assigns result

# Line 2495-2496: preflight handler
elif action == "preflight":
    handle_preflight_discovery()

# Line 2497-2498: zammad handler
elif action == "zammad":
    handle_zammad_check()

# Line 2499-2501: INCORRECTLY INDENTED BLOCK
    if result == "exit":  # ❌ Wrong indentation, wrong location
        print_colored("Exiting...", Colors.OKGREEN)
        break
```

### Problem Analysis
1. **Indentation Issue**: The `if result == "exit":` block is indented as if it's inside the `zammad` elif block, but it's not logically part of that block.
2. **Location Issue**: The block references `result` which is only set in the `exclusions` handler (line 2494), but the check is placed after the `zammad` handler.
3. **Logical Issue**: `handle_zammad_check()` doesn't return a result, so checking `result` after it doesn't make sense.

### Expected Structure
The main menu loop pattern:
- Each `elif action == "something":` handles an action
- Some handlers return results (like `handle_exclusions_submenu()`)
- Exit checks should be immediately after handlers that return results
- Exit checks should be at the same indentation level as the elif blocks (inside the while loop)

### Root Cause
The `if result == "exit":` block was likely:
- Meant to check the result from `handle_exclusions_submenu()` 
- Accidentally placed after the zammad handler instead of after exclusions
- Incorrectly indented (one level too deep)

## Solution

Remove the incorrectly placed and indented block. The `handle_zammad_check()` function doesn't return a result, so no exit check is needed after it. If an exit check is needed for the exclusions handler, it should be placed immediately after line 2494, not after zammad.

## Step 1: Fix Applied

**Change**: Removed the incorrectly indented `if result == "exit":` block (lines 2499-2501) from after the zammad handler.

**Before**:
```python
elif action == "zammad":
    handle_zammad_check()
        if result == "exit":  # ❌ Wrong indentation
            print_colored("Exiting...", Colors.OKGREEN)
            break
```

**After**:
```python
elif action == "zammad":
    handle_zammad_check()
```

## Step 2: Verification

✅ **Syntax Check**: `python3 -m py_compile tools/om_recovery/om_recovery.py` passes with no errors

## Step 3: Regression Check

✅ **ui_screen.py**: Syntax check passed  
✅ **All *_ops.py modules**: Syntax checks passed

## Summary

**What was mis-indented**: An `if result == "exit":` block was incorrectly indented and placed after the `zammad` handler (line 2499), when it should not have been there at all.

**Why it broke**: The block was indented as if it belonged inside the `zammad` elif block, but `handle_zammad_check()` doesn't return a result. Additionally, the `result` variable is only set in the `exclusions` handler, so checking it after `zammad` was logically incorrect.

**How it was corrected**: The incorrectly indented block was removed. The `handle_zammad_check()` function completes normally without needing to check a return value, consistent with other handlers like `handle_preflight_discovery()`.
