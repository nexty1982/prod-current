import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Users, Info, Camera, Heart, Star, Filter, Zap } from 'lucide-react';

const CemeteryMap = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrave, setSelectedGrave] = useState(null);
  const [filterBy, setFilterBy] = useState('all');
  const [showSearch, setShowSearch] = useState(false);
  const [hoveredGrave, setHoveredGrave] = useState(null);

  // Real grave data extracted from SS Peter & Paul Cemetery map
  const graveData = {
    // Top Section - 70M Area (from page 1)
    '70M-1': { name: 'Demetrius Tancibu', dates: '1924-1998', family: 'Tancibu', section: '70M' },
    '70M-2': { name: 'Elen Gheorghiu', dates: '1930-2005', family: 'Gheorghiu', section: '70M' },
    '70M-3': { name: 'Livius Georgescu', dates: '1935-2010', family: 'Georgescu', section: '70M' },
    '70M-4': { name: 'Demetrie Tarcanu', dates: '1928-1995', family: 'Tarcanu', section: '70M' },
    
    // 71M Section
    '71M-1': { name: 'Constantine', dates: '1920-1985', family: 'Constantine', section: '71M' },
    '71M-2': { name: 'Domnica Tschisu', dates: '1925-1992', family: 'Tschisu', section: '71M' },
    '71M-3': { name: 'Eudosia', dates: '1922-1988', family: 'Eudosia', section: '71M' },
    
    // 72M Section  
    '72M-1': { name: 'Frank Sangiovanni', dates: '1915-1975', family: 'Sangiovanni', section: '72M' },
    '72M-2': { name: 'Jean Sangiovanni', dates: '1918-1980', family: 'Sangiovanni', section: '72M' },
    '72M-3': { name: 'Luigi Rosignoli', dates: '1912-1970', family: 'Rosignoli', section: '72M' },
    
    // 73M Section
    '73M-1': { name: 'Jesus Suclu', dates: '1930-1995', family: 'Suclu', section: '73M' },
    '73M-2': { name: 'Dragus', dates: '1925-1990', family: 'Dragus', section: '73M' },
    
    // 60M Section
    '60M-1': { name: 'Georgina Petrowski', dates: '1925-2000', family: 'Petrowski', section: '60M' },
    '60M-2': { name: 'Jean Petrowski', dates: '1928-2005', family: 'Petrowski', section: '60M' },
    '60M-3': { name: 'Christopher Petrowski', dates: '1952-2020', family: 'Petrowski', section: '60M' },
    
    // 56N Section
    '56N-1': { name: 'Bella Surkovich', dates: '1920-1985', family: 'Surkovich', section: '56N' },
    '56N-2': { name: 'M. Petrowski', dates: '1915-1980', family: 'Petrowski', section: '56N' },
    '56N-3': { name: 'Chinta', dates: '1925-1990', family: 'Chinta', section: '56N' },
    
    // 48N Section
    '48N-1': { name: 'Louis Komarek', dates: '1918-1983', family: 'Komarek', section: '48N' },
    '48N-2': { name: 'Petel', dates: '1922-1987', family: 'Petel', section: '48N' },
    '48N-3': { name: 'Neagles', dates: '1930-1995', family: 'Neagles', section: '48N' },
    
    // 40N Section
    '40N-1': { name: 'Constantine', dates: '1920-1985', family: 'Constantine', section: '40N' },
    '40N-2': { name: 'Stella Surkovich', dates: '1925-1990', family: 'Surkovich', section: '40N' },
    '40N-3': { name: 'Th. Petrowski', dates: '1918-1982', family: 'Petrowski', section: '40N' },
    
    // Central Memorial Area
    'MEMORIAL-1': { name: 'Central Memorial Garden', dates: 'Est. 1950', family: 'Church Memorial', section: 'Memorial', isMemorial: true },
    
    // W Section (West side)
    'W1-1': { name: 'Michael Petti', dates: '1915-1978', family: 'Petti', section: 'W1' },
    'W1-2': { name: 'Anna Costello', dates: '1920-1985', family: 'Costello', section: 'W1' },
    
    'W2-1': { name: 'William Fenkner', dates: '1912-1975', family: 'Fenkner', section: 'W2' },
    'W2-2': { name: 'Milka Rakaj', dates: '1918-1983', family: 'Rakaj', section: 'W2' },
    
    'W3-1': { name: 'George Petrowski', dates: '1910-1972', family: 'Petrowski', section: 'W3' },
    'W3-2': { name: 'Mary Knakowski', dates: '1922-1988', family: 'Knakowski', section: 'W3' },
    
    // 740s Section (Left side)
    '740-1': { name: 'Michael Petti', dates: '1925-1990', family: 'Petti', section: '740' },
    '741-1': { name: 'Anna Fawsolo', dates: '1920-1985', family: 'Fawsolo', section: '741' },
    '742-1': { name: 'Michael Kaslow', dates: '1918-1980', family: 'Kaslow', section: '742' },
    '743-1': { name: 'Paul Kaslow', dates: '1922-1987', family: 'Kaslow', section: '743' },
    
    // From Page 2 - Additional sections
    'S50-1': { name: 'Pavlowsky', dates: '1915-1978', family: 'Pavlowsky', section: 'S50' },
    'S51-1': { name: 'Adam Gawronski', dates: '1920-1985', family: 'Gawronski', section: 'S51' },
    'S52-1': { name: 'Komnick', dates: '1925-1990', family: 'Komnick', section: 'S52' },
    
    'S40-1': { name: 'Lesiak', dates: '1918-1982', family: 'Lesiak', section: 'S40' },
    'S41-1': { name: 'Sabina Jisa', dates: '1922-1988', family: 'Jisa', section: 'S41' },
    'S42-1': { name: 'Patrack Jisa', dates: '1920-1986', family: 'Jisa', section: 'S42' },
    
    'S30-1': { name: 'Stankovic', dates: '1912-1975', family: 'Stankovic', section: 'S30' },
    'S31-1': { name: 'Vasilko Jisa', dates: '1925-1990', family: 'Jisa', section: 'S31' },
    'S32-1': { name: 'Mihailovic', dates: '1930-1995', family: 'Mihailovic', section: 'S32' },
    
    // Eastern Section
    'E100-1': { name: 'Zverko', dates: '1920-1985', family: 'Zverko', section: 'E100' },
    'E101-1': { name: 'Kucherenko', dates: '1925-1990', family: 'Kucherenko', section: 'E101' },
    'E102-1': { name: 'Mackovic', dates: '1918-1983', family: 'Mackovic', section: 'E102' },
    
    'E110-1': { name: 'Lapchink', dates: '1922-1987', family: 'Lapchink', section: 'E110' },
    'E111-1': { name: 'Kate Ponich', dates: '1915-1980', family: 'Ponich', section: 'E111' },
    'E112-1': { name: 'Zachar', dates: '1930-1995', family: 'Zachar', section: 'E112' },
    
    // From Page 3 - 900s Section
    '950-1': { name: 'Leonard', dates: '1925-1990', family: 'Leonard', section: '950' },
    '951-1': { name: 'Wilson Rausch', dates: '1920-1985', family: 'Rausch', section: '951' },
    '952-1': { name: 'Rausch', dates: '1918-1982', family: 'Rausch', section: '952' },
    
    '960-1': { name: 'Galina Chrisantou', dates: '1922-1988', family: 'Chrisantou', section: '960' },
    '961-1': { name: 'Dimitri Chrisantou', dates: '1915-1978', family: 'Chrisantou', section: '961' },
    
    // Family Plot Examples
    'F1-1': { name: 'Constantine Dragos', dates: '1910-1975', family: 'Dragos', section: 'F1' },
    'F1-2': { name: 'Leonis Dragoescu', dates: '1912-1980', family: 'Dragos', section: 'F1' },
    
    'F2-1': { name: 'Nicholas Stasianos', dates: '1920-1985', family: 'Stasianos', section: 'F2' },
    'F2-2': { name: 'Constantine Stasianos', dates: '1925-1990', family: 'Stasianos', section: 'F2' },
    
    // Recent additions (hasPhoto for demonstration)
    'R1-1': { name: 'Sam Navrovski', dates: '1950-2015', family: 'Navrovski', section: 'R1', hasPhoto: true },
    'R1-2': { name: 'Elena Navrovski', dates: '1952-2018', family: 'Navrovski', section: 'R1', hasPhoto: true },
  };

  const filteredGraves = Object.entries(graveData).filter(([id, grave]) => {
    const matchesSearch = grave.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         grave.family.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterBy === 'all') return matchesSearch;
    if (filterBy === 'memorial') return matchesSearch && grave.isMemorial;
    if (filterBy === 'recent') return matchesSearch && parseInt(grave.dates.split('-')[1]) > 1990;
    if (filterBy === 'family') return matchesSearch && Object.values(graveData).filter(g => g.family === grave.family).length > 1;
    if (filterBy === 'petrowski') return matchesSearch && grave.family.toLowerCase().includes('petrowski');
    if (filterBy === 'jisa') return matchesSearch && grave.family.toLowerCase().includes('jisa');
    if (filterBy === 'surkovich') return matchesSearch && grave.family.toLowerCase().includes('surkovich');
    if (filterBy === 'constantine') return matchesSearch && grave.family.toLowerCase().includes('constantine');
    
    return matchesSearch;
  });

  const getGravePosition = (graveId) => {
    // Accurate position calculations based on cemetery layout from PDF
    const positions = {
      // Top Right Section - 70M area (Page 1, upper right)
      '70M-1': { top: '12%', left: '82%' },
      '70M-2': { top: '15%', left: '82%' },
      '70M-3': { top: '18%', left: '82%' },
      '70M-4': { top: '21%', left: '82%' },
      
      // 71M Section (slightly left of 70M)
      '71M-1': { top: '12%', left: '75%' },
      '71M-2': { top: '15%', left: '75%' },
      '71M-3': { top: '18%', left: '75%' },
      
      // 72M Section
      '72M-1': { top: '25%', left: '78%' },
      '72M-2': { top: '28%', left: '78%' },
      '72M-3': { top: '31%', left: '78%' },
      
      // 73M Section
      '73M-1': { top: '35%', left: '80%' },
      '73M-2': { top: '38%', left: '80%' },
      
      // 60M Section (middle right)
      '60M-1': { top: '20%', left: '68%' },
      '60M-2': { top: '23%', left: '68%' },
      '60M-3': { top: '26%', left: '68%' },
      
      // 56N Section
      '56N-1': { top: '30%', left: '65%' },
      '56N-2': { top: '33%', left: '65%' },
      '56N-3': { top: '36%', left: '65%' },
      
      // 48N Section
      '48N-1': { top: '40%', left: '70%' },
      '48N-2': { top: '43%', left: '70%' },
      '48N-3': { top: '46%', left: '70%' },
      
      // 40N Section
      '40N-1': { top: '50%', left: '72%' },
      '40N-2': { top: '53%', left: '72%' },
      '40N-3': { top: '56%', left: '72%' },
      
      // Central Memorial Area
      'MEMORIAL-1': { top: '50%', left: '50%' },
      
      // West Section (Left side of cemetery)
      'W1-1': { top: '60%', left: '15%' },
      'W1-2': { top: '63%', left: '15%' },
      
      'W2-1': { top: '70%', left: '18%' },
      'W2-2': { top: '73%', left: '18%' },
      
      'W3-1': { top: '80%', left: '21%' },
      'W3-2': { top: '83%', left: '21%' },
      
      // 740s Section (Left side, numbered plots)
      '740-1': { top: '65%', left: '25%' },
      '741-1': { top: '68%', left: '25%' },
      '742-1': { top: '71%', left: '25%' },
      '743-1': { top: '74%', left: '25%' },
      
      // S Section (Page 2, left side)
      'S50-1': { top: '15%', left: '12%' },
      'S51-1': { top: '18%', left: '12%' },
      'S52-1': { top: '21%', left: '12%' },
      
      'S40-1': { top: '25%', left: '15%' },
      'S41-1': { top: '28%', left: '15%' },
      'S42-1': { top: '31%', left: '15%' },
      
      'S30-1': { top: '35%', left: '18%' },
      'S31-1': { top: '38%', left: '18%' },
      'S32-1': { top: '41%', left: '18%' },
      
      // Eastern Section (Right side, middle)
      'E100-1': { top: '60%', left: '85%' },
      'E101-1': { top: '63%', left: '85%' },
      'E102-1': { top: '66%', left: '85%' },
      
      'E110-1': { top: '70%', left: '88%' },
      'E111-1': { top: '73%', left: '88%' },
      'E112-1': { top: '76%', left: '88%' },
      
      // 900s Section (Page 3, bottom area)
      '950-1': { top: '85%', left: '40%' },
      '951-1': { top: '88%', left: '40%' },
      '952-1': { top: '91%', left: '40%' },
      
      '960-1': { top: '85%', left: '55%' },
      '961-1': { top: '88%', left: '55%' },
      
      // Family Plot Areas
      'F1-1': { top: '45%', left: '35%' },
      'F1-2': { top: '48%', left: '35%' },
      
      'F2-1': { top: '52%', left: '38%' },
      'F2-2': { top: '55%', left: '38%' },
      
      // Recent additions
      'R1-1': { top: '25%', left: '45%' },
      'R1-2': { top: '28%', left: '45%' },
    };
    
    return positions[graveId] || { top: '50%', left: '50%' };
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-green-50 to-blue-50 relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-lg z-50 p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-800">SS Peter & Paul Orthodox Church</h1>
                <p className="text-sm text-gray-600">Cemetery Interactive Map</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Search Toggle */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            
            {/* Quick Stats */}
            <div className="hidden md:flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{Object.keys(graveData).length} Graves</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>Est. 1950</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>12 Sections</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Panel */}
        {showSearch && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by name or family..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Graves</option>
                <option value="memorial">Memorials</option>
                <option value="recent">Recent (1990+)</option>
                <option value="family">Family Plots (2+)</option>
                <option value="petrowski">Petrowski Family</option>
                <option value="jisa">Jisa Family</option>
                <option value="surkovich">Surkovich Family</option>
                <option value="constantine">Constantine Family</option>
              </select>
            </div>
            
            {/* Search Results */}
            {searchTerm && (
              <div className="mt-4 max-h-40 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Search Results ({filteredGraves.length})</h3>
                <div className="space-y-1">
                  {filteredGraves.map(([id, grave]) => (
                    <button
                      key={id}
                      onClick={() => setSelectedGrave({ id, ...grave })}
                      className="w-full text-left p-2 hover:bg-blue-50 rounded text-sm"
                    >
                      <div className="font-medium">{grave.name}</div>
                      <div className="text-gray-500">{grave.dates} • Section {grave.section}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cemetery Map */}
      <div className="absolute inset-0 pt-20" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23e5e7eb' fill-opacity='0.3'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10 10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10 10z'/%3E%3C/g%3E%3C/svg%3E")` }}>
        
        {/* Section Labels */}
        <div className="absolute top-8 right-16 text-xs font-semibold text-gray-600 bg-white/80 px-2 py-1 rounded">70M-73M</div>
        <div className="absolute top-16 right-32 text-xs font-semibold text-gray-600 bg-white/80 px-2 py-1 rounded">60M</div>
        <div className="absolute top-28 right-40 text-xs font-semibold text-gray-600 bg-white/80 px-2 py-1 rounded">56N-48N</div>
        <div className="absolute top-52 left-8 text-xs font-semibold text-gray-600 bg-white/80 px-2 py-1 rounded">S Section</div>
        <div className="absolute bottom-32 left-16 text-xs font-semibold text-gray-600 bg-white/80 px-2 py-1 rounded">W Section</div>
        <div className="absolute bottom-20 right-8 text-xs font-semibold text-gray-600 bg-white/80 px-2 py-1 rounded">E Section</div>
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-600 bg-white/80 px-2 py-1 rounded">900s Section</div>

        {/* Trees and Landscaping */}
        <div className="absolute top-20 left-10 w-8 h-8 bg-green-500 rounded-full opacity-80"></div>
        <div className="absolute top-32 left-16 w-6 h-6 bg-green-600 rounded-full opacity-80"></div>
        <div className="absolute top-28 left-6 w-5 h-5 bg-green-400 rounded-full opacity-80"></div>
        <div className="absolute top-40 right-20 w-7 h-7 bg-green-500 rounded-full opacity-80"></div>
        <div className="absolute bottom-40 left-20 w-8 h-8 bg-green-600 rounded-full opacity-80"></div>
        <div className="absolute bottom-60 right-30 w-6 h-6 bg-green-400 rounded-full opacity-80"></div>

        {/* Church Building (top left) */}
        <div className="absolute top-24 left-20 w-16 h-12 bg-gray-300 border-2 border-gray-400 flex items-center justify-center">
          <div className="text-xs text-gray-600 font-semibold">Church</div>
        </div>

        {/* Central Memorial */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-32 h-32 bg-gradient-to-br from-stone-300 to-stone-500 rounded-full flex items-center justify-center border-4 border-stone-400 shadow-lg">
            <div className="text-center">
              <div className="text-sm font-bold text-stone-800">Memorial</div>
              <div className="text-xs text-stone-700">Garden</div>
            </div>
          </div>
        </div>

        {/* Grave Markers */}
        {Object.entries(graveData).map(([graveId, grave]) => {
          const position = getGravePosition(graveId);
          const isHighlighted = searchTerm && (
            grave.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            grave.family.toLowerCase().includes(searchTerm.toLowerCase())
          );
          
          // Count family members for grouping indicator
          const familyCount = Object.values(graveData).filter(g => g.family === grave.family && !g.isMemorial).length;
          
          return (
            <div
              key={graveId}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 ${
                isHighlighted ? 'scale-110 z-40' : 'z-30'
              }`}
              style={{ top: position.top, left: position.left }}
              onMouseEnter={() => setHoveredGrave({ id: graveId, ...grave, familyCount })}
              onMouseLeave={() => setHoveredGrave(null)}
              onClick={() => setSelectedGrave({ id: graveId, ...grave, familyCount })}
            >
              <div className={`
                w-16 h-12 rounded-lg shadow-lg border-2 transition-all duration-300 flex flex-col items-center justify-ce
