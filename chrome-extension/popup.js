document.addEventListener('DOMContentLoaded', async () => {
  const startButton = document.getElementById('startButton');
  const exportButton = document.getElementById('exportButton');
  const statusDiv = document.getElementById('status');
  const countDiv = document.getElementById('count');

  try {
    // Get the current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('linkedin.com/sales')) {
      statusDiv.textContent = 'Please navigate to LinkedIn Sales Navigator';
      startButton.disabled = true;
      return;
    }

    if (!tab.url.includes('search/people')) {
      statusDiv.textContent = 'Please open a saved search';
      startButton.disabled = true;
      return;
    }

    // Check if we have saved data
    const result = await chrome.storage.local.get('extractedData');
    if (result.extractedData && result.extractedData.length > 0) {
      countDiv.textContent = `${result.extractedData.length} leads found`;
      exportButton.disabled = false;
    }

    startButton.addEventListener('click', async () => {
      try {
        startButton.disabled = true;
        exportButton.disabled = true;
        statusDiv.textContent = 'Reading leads...';
        
        await chrome.tabs.sendMessage(tab.id, { action: 'startReading' });
      } catch (error) {
        console.error('Error starting reading:', error);
        statusDiv.textContent = 'Error: ' + error.message;
        startButton.disabled = false;
      }
    });

    exportButton.addEventListener('click', async () => {
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'exportData' });
      } catch (error) {
        console.error('Error exporting data:', error);
        statusDiv.textContent = 'Error: ' + error.message;
      }
    });

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'status') {
        statusDiv.textContent = message.message;
      } else if (message.type === 'progress') {
        countDiv.textContent = `${message.count} leads found`;
        if (message.completed) {
          startButton.disabled = false;
          exportButton.disabled = false;
        }
      }
    });

  } catch (error) {
    console.error('Initialization error:', error);
    statusDiv.textContent = 'Error: ' + error.message;
    startButton.disabled = true;
  }
});

document.getElementById('extractFilters').addEventListener('click', async () => {
  const status = document.getElementById('status');
  status.style.display = 'block';
  status.className = '';
  status.textContent = 'Extracting filters...';

  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('No active tab found');
    }
    
    // Check if we're on Sales Navigator
    if (!tab.url.includes('linkedin.com/sales')) {
      throw new Error('Please navigate to LinkedIn Sales Navigator first');
    }

    console.log('Executing content script on tab:', tab.id);
    
    // Execute the content script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractFilters
    });

    if (!results || results.length === 0) {
      throw new Error('Failed to execute content script');
    }

    const filters = results[0].result;
    console.log('Extracted filters:', filters);

    // Always download a debug file with every extraction
    const debugData = {
      ...filters,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: tab.url
    };
    
    const debugBlob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
    await chrome.downloads.download({
      url: URL.createObjectURL(debugBlob),
      filename: `linkedin-filters-debug-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
      saveAs: true
    });
    status.innerHTML = '<b>Debug file downloaded. Please upload it to your assistant if extraction is incomplete.</b>';

    // If debug info is present, show it in the popup
    if (filters && filters.debug) {
      const foundTitles = Array.isArray(filters.debug.foundTitles) ? filters.debug.foundTitles.join(', ') : '';
      const fieldsetTexts = Array.isArray(filters.debug.fieldsetTexts)
        ? filters.debug.fieldsetTexts.map(f => `${f.filterName || ''}: ${f.text || ''}`).join('\n---\n')
        : '';
      status.className = 'error';
      status.innerHTML += `<br><b>Debug info:</b><br>Found fieldsets: ${filters.debug.foundFieldsets || 0}<br>Found titles: ${foundTitles}<br><br>Fieldset texts:<br><textarea style='width:100%;height:200px'>${fieldsetTexts}</textarea>`;
      return;
    }

    if (!filters || Object.keys(filters).length === 0) {
      status.className = 'error';
      status.innerHTML += '<br><b>No filters found. Please upload the debug file to your assistant.</b>';
      throw new Error('No filters found. Please make sure you are on the Sales Navigator search page');
    }

    // Create and download JSON file
    const jsonBlob = new Blob([JSON.stringify(filters, null, 2)], { type: 'application/json' });
    await chrome.downloads.download({
      url: URL.createObjectURL(jsonBlob),
      filename: 'linkedin-filters.json',
      saveAs: true
    });

    // Create and download CSV file
    const csvContent = Object.entries(filters)
      .map(([filter, values]) => Array.isArray(values) ? values.map(value => `${filter},"${value}"`).join('\n') : '').join('\n');
    const csvBlob = new Blob(['Filter,Value\n' + csvContent], { type: 'text/csv' });
    await chrome.downloads.download({
      url: URL.createObjectURL(csvBlob),
      filename: 'linkedin-filters.csv',
      saveAs: true
    });

    status.className = 'success';
    status.textContent = 'Filters extracted successfully! Debug file also downloaded.';
  } catch (error) {
    status.className = 'error';
    status.textContent = error.message;
  }
});

// Function that will be injected into the page
async function extractFilters() {
  // Map LinkedIn filter keys to display names
  const filterKeyToName = {
    COMPANY_HEADCOUNT: 'Company Headcount',
    COMPANY_TYPE: 'Company Type',
    COMPANY_HEADQUARTERS: 'Company Headquarters Location',
    FUNCTION: 'Function',
    CURRENT_TITLE: 'Current Job Title',
    SENIORITY_LEVEL: 'Seniority Level',
    GEOGRAPHY: 'Geography',
    INDUSTRY: 'Industry',
    POSTED_ON_LINKEDIN: 'Posted on LinkedIn',
  };
  const targetFilters = Object.values(filterKeyToName);

  const filters = {};
  let foundAny = false;
  const debugFieldsetTexts = [];
  const debugTitles = [];
  const debugErrors = [];

  try {
    // Find all fieldsets with data-x-search-filter
    const fieldsets = Array.from(document.querySelectorAll('fieldset[data-x-search-filter]'));
    console.log('Found fieldsets:', fieldsets.length);

    for (const fieldset of fieldsets) {
      try {
        const filterKey = fieldset.getAttribute('data-x-search-filter');
        const filterName = filterKeyToName[filterKey];
        if (!filterName) {
          console.log('Skipping unknown filter key:', filterKey);
          continue;
        }
        
        debugTitles.push(filterName);
        foundAny = true;

        // Try to expand the filter if it has a button (for LOVs)
        const expandBtn = fieldset.querySelector('button[aria-label*="Expand"], button[aria-label*="Show more"], button[aria-label*="Show all"]');
        if (expandBtn) {
          console.log('Found expand button for:', filterName);
          expandBtn.click();
          await new Promise(r => setTimeout(r, 1000)); // Increased timeout
        }

        let values = [];
        // 1. Try to extract LOVs from typeahead list
        const typeaheadList = fieldset.querySelector('ul.artdeco-typeahead__results-list');
        if (typeaheadList) {
          console.log('Found typeahead list for:', filterName);
          const items = typeaheadList.querySelectorAll('li .button--fill-click-area');
          items.forEach(item => {
            const value = item.innerText.trim();
            if (value && !values.includes(value)) values.push(value);
          });
        }

        // 2. Try to extract from checkboxes/toggles
        if (values.length === 0) {
          const toggles = fieldset.querySelectorAll('input[type="checkbox"]');
          if (toggles.length > 0) {
            console.log('Found toggles for:', filterName);
            toggles.forEach(toggle => {
              const label = fieldset.querySelector(`label[for="${toggle.id}"]`);
              let value = '';
              if (label) {
                value = label.innerText.trim();
              } else {
                value = toggle.getAttribute('aria-label') || '';
              }
              if (value) {
                values.push(toggle.checked ? 'On' : 'Off');
              }
            });
          }
        }

        // 3. Fallback extraction
        if (values.length === 0) {
          console.log('Using fallback extraction for:', filterName);
          const valueElements = fieldset.querySelectorAll('label, button, div, span, input, [data-x-search-filter], [data-test-filter-option-label]');
          valueElements.forEach(el => {
            let value = el.innerText ? el.innerText.trim() : (el.value ? el.value.trim() : '');
            if (value && !values.includes(value)) {
              values.push(value);
            }
          });
        }

        // Cleanup values
        values = values
          .map(v => v.replace(/\n/g, ' ').trim())
          .filter((v, i, arr) =>
            v &&
            arr.indexOf(v) === i &&
            v.length > 1 &&
            !/Expand|Try advanced filters|Use the Geography, Industry, and Title filters|Select|filter/i.test(v) &&
            v.toLowerCase() !== filterName.toLowerCase()
          );

        if (values.length > 0) {
          filters[filterName] = values;
          console.log(`Successfully extracted ${values.length} values for ${filterName}`);
        } else {
          debugFieldsetTexts.push({
            filterName,
            text: fieldset.innerText.slice(0, 500),
            html: fieldset.innerHTML.slice(0, 1000)
          });
          console.log('No values found for:', filterName);
        }
      } catch (fieldsetError) {
        debugErrors.push({
          filterName: filterKeyToName[fieldset.getAttribute('data-x-search-filter')] || 'Unknown',
          error: fieldsetError.message
        });
        console.error('Error processing fieldset:', fieldsetError);
      }
    }

    // Debug output
    if (!foundAny || Object.keys(filters).length === 0) {
      return {
        debug: {
          foundFieldsets: fieldsets.length,
          foundTitles: debugTitles,
          fieldsetTexts: debugFieldsetTexts,
          errors: debugErrors,
          timestamp: new Date().toISOString()
        },
        filters: {},
        html: document.body.innerHTML,
        url: window.location.href
      };
    }

    return {
      filters,
      html: document.body.innerHTML,
      url: window.location.href,
      debug: {
        foundFieldsets: fieldsets.length,
        foundTitles: debugTitles,
        errors: debugErrors,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Fatal error in extractFilters:', error);
    return {
      error: error.message,
      stack: error.stack,
      debug: {
        foundFieldsets: 0,
        foundTitles: debugTitles,
        fieldsetTexts: debugFieldsetTexts,
        errors: debugErrors,
        timestamp: new Date().toISOString()
      }
    };
  }
} 