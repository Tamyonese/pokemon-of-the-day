import { useState, useEffect } from 'react'
import './App.css'

interface Pokemon {
  id: number;
  name: string;
  sprites: {
    front_default: string;
    front_shiny: string;
    versions: {
      'generation-v': {
        'black-white': {
          animated: {
            front_default: string;
            front_shiny: string;
          };
        };
      };
    };
  };
  types: Array<{
    type: {
      name: string;
      url: string;
    };
  }>;
  height: number;
  weight: number;
}

interface PokemonSpecies {
  flavor_text_entries: Array<{
    flavor_text: string;
    language: {
      name: string;
    };
  }>;
  names: Array<{
    name: string;
    language: {
      name: string;
    };
  }>;
  generation: {
    name: string;
  };
}

interface TypeData {
  names: Array<{
    name: string;
    language: {
      name: string;
    };
  }>;
}

function App() {
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [funFact, setFunFact] = useState<string>('');
  const [germanName, setGermanName] = useState<string>('');
  const [translatedTypes, setTranslatedTypes] = useState<string[]>([]);
  const [isShiny, setIsShiny] = useState(false);
  const [timeUntilNext, setTimeUntilNext] = useState<string>('');
  const [generation, setGeneration] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const getDailyPokemon = async () => {
    try {
      setLoading(true);
      setError('');
      const now = new Date();
      const germanTime = new Date(now.toLocaleString('en-US', { 
        timeZone: 'Europe/Berlin',
        hour12: false 
      }));
      const startOfYear = new Date(germanTime.getFullYear(), 0, 0);
      const diff = germanTime.getTime() - startOfYear.getTime();
      const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
      const pokemonId = (dayOfYear % 898) + 1;
      
      console.log('Fetching Pokemon ID:', pokemonId);
      
      const [pokemonResponse, speciesResponse] = await Promise.all([
        fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`),
        fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`)
      ]);
      
      if (!pokemonResponse.ok || !speciesResponse.ok) {
        throw new Error(`API Error: ${pokemonResponse.status} ${speciesResponse.status}`);
      }
      
      const pokemonData = await pokemonResponse.json();
      const speciesData: PokemonSpecies = await speciesResponse.json();
      
      console.log('Pokemon data received:', pokemonData.name);
      
      setPokemon(pokemonData);
      
      const germanNameEntry = speciesData.names.find(
        entry => entry.language.name === 'de'
      );
      if (germanNameEntry) {
        setGermanName(germanNameEntry.name);
      }

      const generationMatch = speciesData.generation.name.match(/generation-([iv]+)/i);
      if (generationMatch) {
        setGeneration(generationMatch[1].toUpperCase());
      }

      const germanFlavorText = speciesData.flavor_text_entries.find(
        entry => entry.language.name === 'de'
      );
      
      if (germanFlavorText) {
        setFunFact(germanFlavorText.flavor_text.replace(/\n/g, ' '));
      }

      const typePromises = pokemonData.types.map(async (type: any) => {
        const typeResponse = await fetch(type.type.url);
        if (!typeResponse.ok) {
          throw new Error(`Type API Error: ${typeResponse.status}`);
        }
        const typeData: TypeData = await typeResponse.json();
        const germanType = typeData.names.find(
          entry => entry.language.name === 'de'
        );
        return germanType ? germanType.name : type.type.name;
      });

      const types = await Promise.all(typePromises);
      setTranslatedTypes(types);

    } catch (error) {
      console.error('Error fetching Pokemon:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getSpriteUrl = () => {
    if (!pokemon) return '';
    
    const animatedSprite = pokemon.sprites.versions?.['generation-v']?.['black-white']?.animated;
    if (animatedSprite?.front_default) {
      return isShiny ? animatedSprite.front_shiny : animatedSprite.front_default;
    }
    
    return isShiny ? pokemon.sprites.front_shiny : pokemon.sprites.front_default;
  };

  const getTypeColor = (type: string) => `type-${type.toLowerCase()}`;

  const updateCountdown = () => {
    const now = new Date();
    const germanTime = new Date(now.toLocaleString('en-US', { 
      timeZone: 'Europe/Berlin',
      hour12: false 
    }));
    
    const tomorrow = new Date(germanTime);
    tomorrow.setHours(24, 0, 0, 0);
    
    const diff = tomorrow.getTime() - germanTime.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    setTimeUntilNext(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
  };

  useEffect(() => {
    getDailyPokemon();
    const timer = setInterval(updateCountdown, 1000);
    updateCountdown();
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="app">
        <h1>Pokemon des Tages</h1>
        <div className="pokemon-card">
          <div className="loading">Lade Pokemon...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <h1>Pokemon des Tages</h1>
        <div className="pokemon-card">
          <div className="error">
            <p>Fehler beim Laden des Pokemon:</p>
            <p>{error}</p>
            <button className="reset-button" onClick={getDailyPokemon}>
              Erneut versuchen
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!pokemon) {
    return (
      <div className="app">
        <h1>Pokemon des Tages</h1>
        <div className="pokemon-card">
          <div className="error">Kein Pokemon gefunden</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <h1>Pokemon des Tages</h1>
      <div className={`pokemon-card ${pokemon?.types[0]?.type.name ? getTypeColor(pokemon.types[0].type.name) : ''}`}>
        <button 
          className={`shiny-toggle ${isShiny ? 'active' : ''}`}
          onClick={() => setIsShiny(!isShiny)}
          title="Shiny"
        />
        <div className="pokemon-image-container">
          <img 
            src={getSpriteUrl()} 
            alt={germanName || pokemon.name}
          />
        </div>
        <h2>{germanName || pokemon.name}</h2>
        <div className="pokemon-details">
          <div className="type-container">
            <strong>Typ:</strong>
            <div className="type-badges">
              {pokemon.types.map((type, index) => (
                <span key={index} className={`type-badge ${getTypeColor(type.type.name)}`}>
                  {translatedTypes[index]}
                </span>
              ))}
            </div>
          </div>
          <p><strong>Generation:</strong> {generation}</p>
          <p><strong>Größe:</strong> {pokemon.height / 10}m</p>
          <p><strong>Gewicht:</strong> {pokemon.weight / 10}kg</p>
          {funFact && (
            <div className="fun-fact">
              <h3>Information</h3>
              <p>{funFact}</p>
            </div>
          )}
        </div>
      </div>
      <div className="countdown">
        <p>Nächstes Pokemon in: {timeUntilNext}</p>
        <p className="timezone">(Deutsche Zeit)</p>
      </div>
    </div>
  )
}

export default App
