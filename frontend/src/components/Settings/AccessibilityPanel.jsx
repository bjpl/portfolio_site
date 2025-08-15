import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from '../../store/StoreProvider';
import LanguageSelector from './LanguageSelector';
import './AccessibilityPanel.css';

const AccessibilityPanel = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const preferences = useSelector(state => state.preferences);
  const { theme } = useSelector(state => state.ui);
  
  const [localSettings, setLocalSettings] = useState({
    // Visual
    theme: theme || 'light',
    fontSize: preferences.fontSize || 'medium',
    highContrast: preferences.highContrast || false,
    reducedMotion: preferences.reducedMotion || false,
    colorBlindMode: preferences.colorBlindMode || 'none',
    
    // Reading
    dyslexiaFont: preferences.dyslexiaFont || false,
    lineHeight: preferences.lineHeight || 'normal',
    letterSpacing: preferences.letterSpacing || 'normal',
    wordSpacing: preferences.wordSpacing || 'normal',
    readingGuide: preferences.readingGuide || false,
    focusHighlight: preferences.focusHighlight || false,
    
    // Navigation
    keyboardShortcuts: preferences.keyboardShortcuts !== false,
    skipLinks: preferences.skipLinks !== false,
    largeClickTargets: preferences.largeClickTargets || false,
    stickyNavigation: preferences.stickyNavigation !== false,
    
    // Audio
    screenReaderOptimized: preferences.screenReaderOptimized || false,
    audioDescriptions: preferences.audioDescriptions || false,
    soundEffects: preferences.soundEffects !== false,
    
    // Cognitive
    simpleLanguage: preferences.simpleLanguage || false,
    readingTime: preferences.readingTime !== false,
    progressIndicators: preferences.progressIndicators !== false,
    autoplay: preferences.autoplay !== false,
  });

  // Apply settings to document
  useEffect(() => {
    applyAccessibilitySettings(localSettings);
  }, [localSettings]);

  const applyAccessibilitySettings = (settings) => {
    const root = document.documentElement;
    
    // Theme
    root.setAttribute('data-theme', settings.theme);
    
    // Font size
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px',
      xlarge: '20px',
      xxlarge: '24px'
    };
    root.style.setProperty('--base-font-size', fontSizes[settings.fontSize]);
    
    // High contrast
    root.classList.toggle('high-contrast', settings.highContrast);
    
    // Reduced motion
    root.classList.toggle('reduced-motion', settings.reducedMotion);
    
    // Color blind modes
    root.setAttribute('data-color-blind-mode', settings.colorBlindMode);
    
    // Dyslexia font
    if (settings.dyslexiaFont) {
      root.style.setProperty('--font-family', 'OpenDyslexic, sans-serif');
    } else {
      root.style.removeProperty('--font-family');
    }
    
    // Line height
    const lineHeights = {
      compact: '1.2',
      normal: '1.6',
      relaxed: '1.8',
      loose: '2.0'
    };
    root.style.setProperty('--line-height', lineHeights[settings.lineHeight]);
    
    // Letter spacing
    const letterSpacings = {
      tight: '-0.05em',
      normal: '0',
      wide: '0.05em',
      wider: '0.1em'
    };
    root.style.setProperty('--letter-spacing', letterSpacings[settings.letterSpacing]);
    
    // Word spacing
    const wordSpacings = {
      tight: '-0.05em',
      normal: '0',
      wide: '0.1em',
      wider: '0.2em'
    };
    root.style.setProperty('--word-spacing', wordSpacings[settings.wordSpacing]);
    
    // Other boolean classes
    root.classList.toggle('reading-guide', settings.readingGuide);
    root.classList.toggle('focus-highlight', settings.focusHighlight);
    root.classList.toggle('large-click-targets', settings.largeClickTargets);
    root.classList.toggle('screen-reader-optimized', settings.screenReaderOptimized);
    root.classList.toggle('simple-language', settings.simpleLanguage);
    
    // Store preferences
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
  };

  const handleSettingChange = (setting, value) => {
    const newSettings = { ...localSettings, [setting]: value };
    setLocalSettings(newSettings);
    
    // Update store
    dispatch({
      type: 'PREFERENCES/UPDATE',
      payload: { [setting]: value }
    });
    
    // Announce change for screen readers
    announceChange(`${setting.replace(/([A-Z])/g, ' $1').toLowerCase()} ${value ? 'enabled' : 'disabled'}`);
  };

  const announceChange = (message) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  };

  const resetSettings = () => {
    const defaultSettings = {
      theme: 'light',
      fontSize: 'medium',
      highContrast: false,
      reducedMotion: false,
      colorBlindMode: 'none',
      dyslexiaFont: false,
      lineHeight: 'normal',
      letterSpacing: 'normal',
      wordSpacing: 'normal',
      readingGuide: false,
      focusHighlight: false,
      keyboardShortcuts: true,
      skipLinks: true,
      largeClickTargets: false,
      stickyNavigation: true,
      screenReaderOptimized: false,
      audioDescriptions: false,
      soundEffects: true,
      simpleLanguage: false,
      readingTime: true,
      progressIndicators: true,
      autoplay: true,
    };
    
    setLocalSettings(defaultSettings);
    dispatch({
      type: 'PREFERENCES/RESET'
    });
    
    announceChange('All accessibility settings reset to defaults');
  };

  if (!isOpen) return null;

  return (
    <div className="accessibility-panel" role="dialog" aria-label="Accessibility Settings">
      <div className="accessibility-panel__overlay" onClick={onClose} aria-hidden="true" />
      
      <div className="accessibility-panel__content">
        <header className="accessibility-panel__header">
          <h2>Accessibility Settings</h2>
          <button
            className="accessibility-panel__close"
            onClick={onClose}
            aria-label="Close accessibility settings"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        
        <div className="accessibility-panel__body">
          {/* Language Selection */}
          <section className="accessibility-section">
            <h3>Language / Translation</h3>
            <LanguageSelector />
          </section>
          
          {/* Visual Settings */}
          <section className="accessibility-section">
            <h3>Visual</h3>
            
            <div className="accessibility-option">
              <label htmlFor="theme-select">Theme</label>
              <select
                id="theme-select"
                value={localSettings.theme}
                onChange={(e) => handleSettingChange('theme', e.target.value)}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto (System)</option>
                <option value="high-contrast-light">High Contrast Light</option>
                <option value="high-contrast-dark">High Contrast Dark</option>
              </select>
            </div>
            
            <div className="accessibility-option">
              <label htmlFor="font-size">Font Size</label>
              <select
                id="font-size"
                value={localSettings.fontSize}
                onChange={(e) => handleSettingChange('fontSize', e.target.value)}
              >
                <option value="small">Small</option>
                <option value="medium">Medium (Default)</option>
                <option value="large">Large</option>
                <option value="xlarge">Extra Large</option>
                <option value="xxlarge">XX Large</option>
              </select>
            </div>
            
            <div className="accessibility-option">
              <label htmlFor="color-blind-mode">Color Blind Mode</label>
              <select
                id="color-blind-mode"
                value={localSettings.colorBlindMode}
                onChange={(e) => handleSettingChange('colorBlindMode', e.target.value)}
              >
                <option value="none">None</option>
                <option value="protanopia">Protanopia (Red-Green)</option>
                <option value="deuteranopia">Deuteranopia (Red-Green)</option>
                <option value="tritanopia">Tritanopia (Blue-Yellow)</option>
                <option value="achromatopsia">Achromatopsia (Complete)</option>
              </select>
            </div>
            
            <div className="accessibility-option">
              <input
                type="checkbox"
                id="high-contrast"
                checked={localSettings.highContrast}
                onChange={(e) => handleSettingChange('highContrast', e.target.checked)}
              />
              <label htmlFor="high-contrast">High Contrast</label>
            </div>
            
            <div className="accessibility-option">
              <input
                type="checkbox"
                id="reduced-motion"
                checked={localSettings.reducedMotion}
                onChange={(e) => handleSettingChange('reducedMotion', e.target.checked)}
              />
              <label htmlFor="reduced-motion">Reduce Motion</label>
            </div>
          </section>
          
          {/* Reading Settings */}
          <section className="accessibility-section">
            <h3>Reading</h3>
            
            <div className="accessibility-option">
              <input
                type="checkbox"
                id="dyslexia-font"
                checked={localSettings.dyslexiaFont}
                onChange={(e) => handleSettingChange('dyslexiaFont', e.target.checked)}
              />
              <label htmlFor="dyslexia-font">Dyslexia-Friendly Font</label>
            </div>
            
            <div className="accessibility-option">
              <label htmlFor="line-height">Line Height</label>
              <select
                id="line-height"
                value={localSettings.lineHeight}
                onChange={(e) => handleSettingChange('lineHeight', e.target.value)}
              >
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="relaxed">Relaxed</option>
                <option value="loose">Loose</option>
              </select>
            </div>
            
            <div className="accessibility-option">
              <label htmlFor="letter-spacing">Letter Spacing</label>
              <select
                id="letter-spacing"
                value={localSettings.letterSpacing}
                onChange={(e) => handleSettingChange('letterSpacing', e.target.value)}
              >
                <option value="tight">Tight</option>
                <option value="normal">Normal</option>
                <option value="wide">Wide</option>
                <option value="wider">Wider</option>
              </select>
            </div>
            
            <div className="accessibility-option">
              <label htmlFor="word-spacing">Word Spacing</label>
              <select
                id="word-spacing"
                value={localSettings.wordSpacing}
                onChange={(e) => handleSettingChange('wordSpacing', e.target.value)}
              >
                <option value="tight">Tight</option>
                <option value="normal">Normal</option>
                <option value="wide">Wide</option>
                <option value="wider">Wider</option>
              </select>
            </div>
            
            <div className="accessibility-option">
              <input
                type="checkbox"
                id="reading-guide"
                checked={localSettings.readingGuide}
                onChange={(e) => handleSettingChange('readingGuide', e.target.checked)}
              />
              <label htmlFor="reading-guide">Reading Guide Line</label>
            </div>
            
            <div className="accessibility-option">
              <input
                type="checkbox"
                id="focus-highlight"
                checked={localSettings.focusHighlight}
                onChange={(e) => handleSettingChange('focusHighlight', e.target.checked)}
              />
              <label htmlFor="focus-highlight">Highlight Focus</label>
            </div>
          </section>
          
          {/* Navigation Settings */}
          <section className="accessibility-section">
            <h3>Navigation</h3>
            
            <div className="accessibility-option">
              <input
                type="checkbox"
                id="keyboard-shortcuts"
                checked={localSettings.keyboardShortcuts}
                onChange={(e) => handleSettingChange('keyboardShortcuts', e.target.checked)}
              />
              <label htmlFor="keyboard-shortcuts">Enable Keyboard Shortcuts</label>
            </div>
            
            <div className="accessibility-option">
              <input
                type="checkbox"
                id="skip-links"
                checked={localSettings.skipLinks}
                onChange={(e) => handleSettingChange('skipLinks', e.target.checked)}
              />
              <label htmlFor="skip-links">Show Skip Links</label>
            </div>
            
            <div className="accessibility-option">
              <input
                type="checkbox"
                id="large-click-targets"
                checked={localSettings.largeClickTargets}
                onChange={(e) => handleSettingChange('largeClickTargets', e.target.checked)}
              />
              <label htmlFor="large-click-targets">Large Click Targets</label>
            </div>
            
            <div className="accessibility-option">
              <input
                type="checkbox"
                id="sticky-navigation"
                checked={localSettings.stickyNavigation}
                onChange={(e) => handleSettingChange('stickyNavigation', e.target.checked)}
              />
              <label htmlFor="sticky-navigation">Sticky Navigation</label>
            </div>
          </section>
          
          {/* Screen Reader Settings */}
          <section className="accessibility-section">
            <h3>Screen Reader & Audio</h3>
            
            <div className="accessibility-option">
              <input
                type="checkbox"
                id="screen-reader-optimized"
                checked={localSettings.screenReaderOptimized}
                onChange={(e) => handleSettingChange('screenReaderOptimized', e.target.checked)}
              />
              <label htmlFor="screen-reader-optimized">Optimize for Screen Readers</label>
            </div>
            
            <div className="accessibility-option">
              <input
                type="checkbox"
                id="audio-descriptions"
                checked={localSettings.audioDescriptions}
                onChange={(e) => handleSettingChange('audioDescriptions', e.target.checked)}
              />
              <label htmlFor="audio-descriptions">Audio Descriptions</label>
            </div>
            
            <div className="accessibility-option">
              <input
                type="checkbox"
                id="sound-effects"
                checked={localSettings.soundEffects}
                onChange={(e) => handleSettingChange('soundEffects', e.target.checked)}
              />
              <label htmlFor="sound-effects">Sound Effects</label>
            </div>
          </section>
          
          {/* Cognitive Settings */}
          <section className="accessibility-section">
            <h3>Cognitive</h3>
            
            <div className="accessibility-option">
              <input
                type="checkbox"
                id="simple-language"
                checked={localSettings.simpleLanguage}
                onChange={(e) => handleSettingChange('simpleLanguage', e.target.checked)}
              />
              <label htmlFor="simple-language">Simple Language Mode</label>
            </div>
            
            <div className="accessibility-option">
              <input
                type="checkbox"
                id="reading-time"
                checked={localSettings.readingTime}
                onChange={(e) => handleSettingChange('readingTime', e.target.checked)}
              />
              <label htmlFor="reading-time">Show Reading Time</label>
            </div>
            
            <div className="accessibility-option">
              <input
                type="checkbox"
                id="progress-indicators"
                checked={localSettings.progressIndicators}
                onChange={(e) => handleSettingChange('progressIndicators', e.target.checked)}
              />
              <label htmlFor="progress-indicators">Progress Indicators</label>
            </div>
            
            <div className="accessibility-option">
              <input
                type="checkbox"
                id="autoplay"
                checked={localSettings.autoplay}
                onChange={(e) => handleSettingChange('autoplay', e.target.checked)}
              />
              <label htmlFor="autoplay">Allow Autoplay</label>
            </div>
          </section>
          
          {/* Keyboard Shortcuts Reference */}
          <section className="accessibility-section">
            <h3>Keyboard Shortcuts</h3>
            <div className="keyboard-shortcuts">
              <dl>
                <dt><kbd>Alt</kbd> + <kbd>D</kbd></dt>
                <dd>Toggle dark mode</dd>
                
                <dt><kbd>Alt</kbd> + <kbd>A</kbd></dt>
                <dd>Open accessibility settings</dd>
                
                <dt><kbd>Alt</kbd> + <kbd>L</kbd></dt>
                <dd>Open language selector</dd>
                
                <dt><kbd>Alt</kbd> + <kbd>+</kbd></dt>
                <dd>Increase font size</dd>
                
                <dt><kbd>Alt</kbd> + <kbd>-</kbd></dt>
                <dd>Decrease font size</dd>
                
                <dt><kbd>Alt</kbd> + <kbd>0</kbd></dt>
                <dd>Reset font size</dd>
                
                <dt><kbd>/</kbd></dt>
                <dd>Focus search</dd>
                
                <dt><kbd>Esc</kbd></dt>
                <dd>Close dialogs</dd>
                
                <dt><kbd>Tab</kbd></dt>
                <dd>Navigate forward</dd>
                
                <dt><kbd>Shift</kbd> + <kbd>Tab</kbd></dt>
                <dd>Navigate backward</dd>
              </dl>
            </div>
          </section>
        </div>
        
        <footer className="accessibility-panel__footer">
          <button
            className="accessibility-panel__reset"
            onClick={resetSettings}
          >
            Reset to Defaults
          </button>
          
          <button
            className="accessibility-panel__save"
            onClick={onClose}
          >
            Save & Close
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AccessibilityPanel;