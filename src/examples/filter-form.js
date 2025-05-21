import React, { useState, useEffect } from 'react';

function FilterForm() {
  const [filters, setFilters] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch filters when component mounts
  useEffect(() => {
    async function fetchFilters() {
      try {
        const response = await fetch('http://your-api/api/filters');
        const data = await response.json();
        if (data.success) {
          setFilters(data.data);
        }
      } catch (error) {
        console.error('Error fetching filters:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchFilters();
  }, []);

  // Handle filter selection
  const handleFilterChange = (filterName, value) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Selected filters:', selectedFilters);
    // Here you would typically send these filters to your scraping function
  };

  if (loading) return <div>Loading filters...</div>;
  if (!filters) return <div>No filters available</div>;

  return (
    <form onSubmit={handleSubmit} className="filter-form">
      <h2>LinkedIn Sales Navigator Filters</h2>
      
      {/* Company Headcount */}
      <div className="filter-group">
        <label>Company Headcount</label>
        <select 
          onChange={(e) => handleFilterChange('Company Headcount', e.target.value)}
          value={selectedFilters['Company Headcount'] || ''}
        >
          <option value="">Select headcount</option>
          {filters['Company Headcount']?.map(value => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </div>

      {/* Company Type */}
      <div className="filter-group">
        <label>Company Type</label>
        <select 
          onChange={(e) => handleFilterChange('Company Type', e.target.value)}
          value={selectedFilters['Company Type'] || ''}
        >
          <option value="">Select company type</option>
          {filters['Company Type']?.map(value => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </div>

      {/* Company Headquarters Location */}
      <div className="filter-group">
        <label>Company Headquarters Location</label>
        <select 
          onChange={(e) => handleFilterChange('Company Headquarters Location', e.target.value)}
          value={selectedFilters['Company Headquarters Location'] || ''}
        >
          <option value="">Select location</option>
          {filters['Company Headquarters Location']?.map(value => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </div>

      {/* Function */}
      <div className="filter-group">
        <label>Function</label>
        <select 
          onChange={(e) => handleFilterChange('Function', e.target.value)}
          value={selectedFilters['Function'] || ''}
        >
          <option value="">Select function</option>
          {filters['Function']?.map(value => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </div>

      {/* Current Job Title */}
      <div className="filter-group">
        <label>Current Job Title</label>
        <select 
          onChange={(e) => handleFilterChange('Current Job Title', e.target.value)}
          value={selectedFilters['Current Job Title'] || ''}
        >
          <option value="">Select job title</option>
          {filters['Current Job Title']?.map(value => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </div>

      {/* Seniority Level */}
      <div className="filter-group">
        <label>Seniority Level</label>
        <select 
          onChange={(e) => handleFilterChange('Seniority Level', e.target.value)}
          value={selectedFilters['Seniority Level'] || ''}
        >
          <option value="">Select seniority</option>
          {filters['Seniority Level']?.map(value => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </div>

      {/* Geography */}
      <div className="filter-group">
        <label>Geography</label>
        <select 
          onChange={(e) => handleFilterChange('Geography', e.target.value)}
          value={selectedFilters['Geography'] || ''}
        >
          <option value="">Select geography</option>
          {filters['Geography']?.map(value => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </div>

      {/* Industry */}
      <div className="filter-group">
        <label>Industry</label>
        <select 
          onChange={(e) => handleFilterChange('Industry', e.target.value)}
          value={selectedFilters['Industry'] || ''}
        >
          <option value="">Select industry</option>
          {filters['Industry']?.map(value => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </div>

      {/* Posted on LinkedIn */}
      <div className="filter-group">
        <label>Posted on LinkedIn</label>
        <select 
          onChange={(e) => handleFilterChange('Posted on LinkedIn', e.target.value)}
          value={selectedFilters['Posted on LinkedIn'] || ''}
        >
          <option value="">Select time period</option>
          {filters['Posted on LinkedIn']?.map(value => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </div>

      <button type="submit" className="submit-button">
        Start Scraping
      </button>
    </form>
  );
}

export default FilterForm; 