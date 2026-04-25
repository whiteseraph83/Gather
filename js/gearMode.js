let _active = false;
export const isGearModeActive = () => _active;
export const toggleGearMode   = () => { _active = !_active; return _active; };
