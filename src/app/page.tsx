'use client';

import { useRef, useEffect, useCallback, useReducer } from 'react';
import { ChevronLeft, ChevronRight, Download, Folder, RotateCcw, X, Heart, BarChart3, Palette, Sparkles, Twitter, RefreshCw } from 'lucide-react';
import NextImage from 'next/image';

interface Asset {
  name: string;
  path: string;
  category: string;
}

interface TextSettings {
  topText: string;
  bottomText: string;
  fontSize: number;
  preset: string;
}

// NFT Creator State Interface
interface NFTCreatorState {
  type: number; // NFT type index
  selectedAssets: Record<string, string>; // layer -> asset path
  availableAssets: Record<string, Asset[]>; // layer -> available assets
  textSettings: TextSettings;
  generationCount: number;
  favorites: string[];
  isLoading: boolean;
  isGenerating: boolean;
  isRendering: boolean;
  nftStory: string;
  selectedLayer: string;
  showModal: boolean;
  showStats: boolean;
}

// Action Types
type NFTCreatorAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_AVAILABLE_ASSETS'; payload: Record<string, Asset[]> }
  | { type: 'SET_SELECTED_ASSETS'; payload: Record<string, string> }
  | { type: 'RANDOMIZE_TRAITS' }
  | { type: 'CHANGE_TYPE'; payload: number }
  | { type: 'CHANGE_TYPE_COMPLETE'; payload: { typeIndex: number; availableAssets: Record<string, Asset[]>; selectedAssets: Record<string, string> } }
  | { type: 'SELECT_TRAIT'; payload: { layer: string; assetPath: string } }
  | { type: 'UPDATE_TEXT'; payload: Partial<TextSettings> }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_RENDERING'; payload: boolean }
  | { type: 'INCREMENT_GENERATION_COUNT' }
  | { type: 'ADD_FAVORITE'; payload: string }
  | { type: 'SET_STORY'; payload: string }
  | { type: 'SET_SELECTED_LAYER'; payload: string }
  | { type: 'SET_SHOW_MODAL'; payload: boolean }
  | { type: 'SET_SHOW_STATS'; payload: boolean }
  | { type: 'COMPLETE_INITIAL_GENERATION'; payload: { assets: Record<string, string>; story: string } };

// Fixed layer order: Background → Body → Head → Face → Aura → Accessory
const LAYER_NAMES = {
  'Golden Predator': ['Background', 'Aura', 'Face', 'Body', 'Head', 'Accessory'],
  'Golden Prey': ['Background', 'Aura', 'Face', 'Body', 'Head', 'Accessory'],
  'Predator': ['Background', 'Aura', 'Face', 'Body', 'Head', 'Accessory'],
  'Prey': ['Background', 'Aura', 'Face', 'Body', 'Head', 'Accessory']
};

const NFT_TYPES = ['Golden Predator', 'Golden Prey', 'Predator', 'Prey'];

const FONT_PRESETS = [
  { name: 'Bold Impact', font: 'Impact, "Arial Black", "Helvetica Neue", Arial, sans-serif', size: 32 },
  { name: 'Clean Modern', font: '"Segoe UI", -apple-system, BlinkMacSystemFont, "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif', size: 30 },
  { name: 'Retro Gaming', font: '"Courier New", "Monaco", "Menlo", "Consolas", monospace', size: 28 },
  { name: 'Elegant Serif', font: '"Georgia", "Times New Roman", "Palatino", "Book Antiqua", serif', size: 34 },
  { name: 'Street Style', font: '"Arial Black", "Trebuchet MS", "Lucida Grande", "Lucida Sans Unicode", sans-serif', size: 31 },
  { name: 'Futuristic', font: '"Orbitron", "Exo 2", "Rajdhani", "Michroma", "Share Tech Mono", monospace', size: 29 }
];

// Complete hardcoded asset data - no API needed!
const ALL_ASSETS: Record<string, Record<string, string[]>> = {
  'Golden Predator': {
    'Background': ['Forest'],
    'Aura': ['None', 'Saiyan', 'Super Saiyan'],
    'Face': ['Annoyed', 'Dead', 'Neutral', 'Sleepy', 'Smile'],
    'Body': ['Dolphin', 'Gold Bear', 'Gold Cat', 'Gold Dog', 'Gold Elephant', 'Gold Fox', 'Gold Wolf', 'Orca'],
    'Head': ['Dolphin', 'Gold Bear', 'Gold Cat', 'Gold Dog', 'Gold Elephant', 'Gold Fox', 'Gold Wolf', 'Orca'],
    'Accessory': ['Gold Eyepatch', 'Gold Halo', 'Gold Katana', 'None']
  },
  'Golden Prey': {
    'Background': ['Farm'],
    'Aura': ['None', 'Saiyan', 'Super Saiyan'],
    'Face': ['Annoyed', 'Dead', 'Neutral', 'Sleepy', 'Smile'],
    'Body': ['Gold Bunny', 'Gold Cow', 'Gold Deer', 'Gold Donkey', 'Gold Hedgehog', 'Gold Koala', 'Gold Mouse', 'Gold Owl', 'Gold Panda', 'Gold Pig', 'Gold Sheep', 'Gold Squirrel'],
    'Head': ['Gold Bunny', 'Gold Cow', 'Gold Deer', 'Gold Donkey', 'Gold Hedgehog', 'Gold Koala', 'Gold Mouse', 'Gold Owl', 'Gold Panda', 'Gold Pig', 'Gold Sheep', 'Gold Squirrel'],
    'Accessory': ['Gold Eyepatch', 'Gold Halo', 'Gold Katana', 'None']
  },
  'Predator': {
    'Background': ['Forest'],
    'Aura': ['None', 'Saiyan', 'Super Saiyan'],
    'Face': ['Annoyed', 'Dead', 'Neutral', 'Sleepy', 'Smile'],
    'Body': ['Bear', 'Cat', 'Dog', 'Dolphin', 'Eagle', 'Elephant', 'Fox', 'Monkey', 'Orca', 'Snake', 'Tiger', 'Wolf'],
    'Head': ['Bear', 'Cat', 'Dog', 'Dolphin', 'Eagle', 'Elephant', 'Fox', 'Monkey', 'Orca', 'Snake', 'Tiger', 'Wolf'],
    'Accessory': ['Cigarette', 'Crown', 'Eyepatch', 'Halo', 'Headphones', 'Katana', 'Monocle', 'None', 'Shield', 'Sunglasses']
  },
  'Prey': {
    'Background': ['Farm'],
    'Aura': ['None', 'Saiyan', 'Super Saiyan'],
    'Face': ['Annoyed', 'Dead', 'Neutral', 'Sleepy', 'Smile'],
    'Body': ['Bunny', 'Chicken', 'Cow', 'Deer', 'Donkey', 'Duck', 'Frog', 'Goat', 'Hedgehog', 'Koala', 'Lamb', 'Mouse', 'Owl', 'Panda', 'Penguin', 'Pig', 'Seal', 'Sheep', 'Squirrel', 'Turkey', 'Zebra'],
    'Head': ['Bunny', 'Chicken', 'Cow', 'Deer', 'Donkey', 'Duck', 'Frog', 'Goat', 'Hedgehog', 'Koala', 'Lamb', 'Mouse', 'Owl', 'Panda', 'Penguin', 'Pig', 'Seal', 'Sheep', 'Squirrel', 'Turkey', 'Zebra'],
    'Accessory': ['Cigarette', 'Crown', 'Eyepatch', 'Halo', 'Headphones', 'Katana', 'Monocle', 'None', 'Shield', 'Sunglasses']
  }
};

// Helper function to get assets for a specific type and layer
const getAssets = (type: string, layer: string): Asset[] => {
  const assetNames = ALL_ASSETS[type]?.[layer] || [];
  return assetNames.map(name => ({
    name,
    path: `/nfts/${type}/${layer}/${name}.png`,
    category: layer
  }));
};

// Helper function to generate random traits for a given type
const generateRandomTraits = (availableAssets: Record<string, Asset[]>): Record<string, string> => {
  const newSelection: Record<string, string> = {};
  
  Object.keys(availableAssets).forEach(layer => {
    const layerAssets = availableAssets[layer] || [];
    if (layerAssets.length > 0) {
      const randomAsset = layerAssets[Math.floor(Math.random() * layerAssets.length)];
      newSelection[layer] = randomAsset.path;
    }
  });
  
  return newSelection;
};

// Initial state
const initialState: NFTCreatorState = {
  type: 0,
  selectedAssets: {},
  availableAssets: {},
  textSettings: {
    topText: '',
    bottomText: '',
    fontSize: 32,
    preset: 'Bold Impact'
  },
  generationCount: 0,
  favorites: [],
  isLoading: true,
  isGenerating: false,
  isRendering: false,
  nftStory: '',
  selectedLayer: '',
  showModal: false,
  showStats: false,
};

// State reducer
const nftCreatorReducer = (state: NFTCreatorState, action: NFTCreatorAction): NFTCreatorState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_AVAILABLE_ASSETS':
      return { ...state, availableAssets: action.payload };
    
    case 'SET_SELECTED_ASSETS':
      return { ...state, selectedAssets: action.payload };
    
    case 'RANDOMIZE_TRAITS': {
      if (state.isGenerating || Object.keys(state.availableAssets).length === 0) {
        return state;
      }
      const newAssets = generateRandomTraits(state.availableAssets);
      return { 
        ...state, 
        selectedAssets: newAssets,
        isGenerating: true,
        generationCount: state.generationCount + 1
      };
    }
    
    case 'CHANGE_TYPE': {
      const newIndex = (action.payload + NFT_TYPES.length) % NFT_TYPES.length;
      const newType = NFT_TYPES[newIndex];
      const layers = LAYER_NAMES[newType as keyof typeof LAYER_NAMES];
      
      // Load new assets for the new type
      const newAvailableAssets: Record<string, Asset[]> = {};
      layers.forEach(layer => {
        newAvailableAssets[layer] = getAssets(newType, layer);
      });
      
      // Generate random traits for new type
      const newAssets = generateRandomTraits(newAvailableAssets);
      
      return {
        ...state,
        type: newIndex,
        availableAssets: newAvailableAssets,
        selectedAssets: newAssets,
        isGenerating: true,
        generationCount: state.generationCount + 1
      };
    }
    
    case 'CHANGE_TYPE_COMPLETE':
      return {
        ...state,
        type: action.payload.typeIndex,
        availableAssets: action.payload.availableAssets,
        selectedAssets: action.payload.selectedAssets,
        generationCount: state.generationCount + 1
      };
    
    case 'SELECT_TRAIT':
      return { 
        ...state, 
        selectedAssets: {
          ...state.selectedAssets,
          [action.payload.layer]: action.payload.assetPath
        },
        showModal: false
      };
    
    case 'UPDATE_TEXT':
      return { 
        ...state, 
        textSettings: { ...state.textSettings, ...action.payload }
      };
    
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload };
    
    case 'SET_RENDERING':
      return { ...state, isRendering: action.payload };
    
    case 'INCREMENT_GENERATION_COUNT':
      return { ...state, generationCount: state.generationCount + 1 };
    
    case 'ADD_FAVORITE':
      return { 
        ...state, 
        favorites: [action.payload, ...state.favorites.slice(0, 4)]
      };
    
    case 'SET_STORY':
      return { ...state, nftStory: action.payload };
    
    case 'SET_SELECTED_LAYER':
      return { ...state, selectedLayer: action.payload };
    
    case 'SET_SHOW_MODAL':
      return { ...state, showModal: action.payload };
    
    case 'SET_SHOW_STATS':
      return { ...state, showStats: action.payload };
    
    case 'COMPLETE_INITIAL_GENERATION':
      return {
        ...state,
        selectedAssets: action.payload.assets,
        nftStory: action.payload.story,
        isGenerating: false,
        isLoading: false,
        generationCount: 1
      };
    
    default:
      return state;
  }
};

export default function NFTCreator() {
  const [state, dispatch] = useReducer(nftCreatorReducer, initialState);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasInitializedRef = useRef(false);

  const currentType = NFT_TYPES[state.type];
  const layers = LAYER_NAMES[currentType as keyof typeof LAYER_NAMES];

  // Generate Die Guys themed story
  const generateNFTStory = useCallback((assets: Record<string, string> = state.selectedAssets) => {
    if (Object.keys(assets).length === 0) return '';

    const getAssetName = (layer: string) => {
      const assetPath = assets[layer];
      if (!assetPath) return null;
      const parts = assetPath.split('/');
      const filename = parts[parts.length - 1];
      return filename.replace('.png', '').toLowerCase();
    };

    const body = getAssetName('Body') || 'creature';
    const head = getAssetName('Head') || 'being';
    const accessory = getAssetName('Accessory');
    const aura = getAssetName('Aura');
    const face = getAssetName('Face') || 'neutral';
    const background = getAssetName('Background') || 'unknown realm';

    // Die Guys story templates with more variety
    const templates = [
      // Original crypto-themed stories
      `A ${body} with a ${head} head${accessory && accessory !== 'none' ? ` wearing ${accessory}` : ''} was spotted ${face === 'dead' ? 'getting rekt' : face === 'smile' ? 'moon farming' : face === 'annoyed' ? 'rage quitting' : face === 'sleepy' ? 'diamond handing' : 'aping in'} in the ${background}${aura && aura !== 'none' ? ` while going ${aura}` : ''}. Diamond hands only! 💎🙌`,
      
      `Legend says a ${body} with the head of a ${head}${accessory && accessory !== 'none' ? ` wielding ${accessory}` : ''} once ${face === 'dead' ? 'got liquidated' : face === 'smile' ? 'hit a 100x' : face === 'annoyed' ? 'bought the top' : face === 'sleepy' ? 'hodled through the dip' : 'found alpha'} in the ${background}${aura && aura !== 'none' ? ` after achieving ${aura} form` : ''}. WAGMI! 🚀`,
      
      // Adventure & exploration themes
      `Deep in the ${background}, a brave ${body} with the wisdom of a ${head}${accessory && accessory !== 'none' ? ` equipped with ${accessory}` : ''} ${face === 'dead' ? 'faced the final boss' : face === 'smile' ? 'discovered a hidden treasure' : face === 'annoyed' ? 'encountered a tough puzzle' : face === 'sleepy' ? 'found a peaceful resting spot' : 'began an epic quest'}${aura && aura !== 'none' ? ` surrounded by ${aura} energy` : ''}. The adventure continues! ⚔️`,

      // Meme culture references
      `This ${body} said "I'm built different" and proved it! With a ${head} head${accessory && accessory !== 'none' ? ` and ${accessory} for style` : ''}, they're ${face === 'dead' ? 'down bad but not out' : face === 'smile' ? 'living their best life' : face === 'annoyed' ? 'having a heated gamer moment' : face === 'sleepy' ? 'in their cozy era' : 'absolutely sending it'} in the ${background}${aura && aura !== 'none' ? ` with that ${aura} glow` : ''}. No cap! 🔥`,

      // Mystical & fantasy themes
      `In ancient times, a mystical ${body} bearing the soul of a ${head}${accessory && accessory !== 'none' ? ` blessed with ${accessory}` : ''} ${face === 'dead' ? 'made the ultimate sacrifice' : face === 'smile' ? 'brought joy to all' : face === 'annoyed' ? 'challenged the gods' : face === 'sleepy' ? 'entered eternal meditation' : 'awakened their true power'} within the sacred ${background}${aura && aura !== 'none' ? `, channeling the legendary ${aura}` : ''}. Magic is real! ✨`,

      // Modern lifestyle themes
      `Meet the ${body} influencer taking over social media! This ${head}-headed icon${accessory && accessory !== 'none' ? ` rocks ${accessory} like nobody's business` : ''} and is currently ${face === 'dead' ? 'going through their villain arc' : face === 'smile' ? 'spreading good vibes only' : face === 'annoyed' ? 'calling out the haters' : face === 'sleepy' ? 'promoting self-care Sunday' : 'dropping knowledge bombs'} from their ${background} studio${aura && aura !== 'none' ? ` with that ${aura} aesthetic` : ''}. Follow for more! 📱`,

      // Gaming & esports themes
      `Pro gamer alert! 🎮 This ${body} with ${head} reflexes${accessory && accessory !== 'none' ? ` using ${accessory} for competitive advantage` : ''} just ${face === 'dead' ? 'got spawn camped' : face === 'smile' ? 'clutched a 1v5' : face === 'annoyed' ? 'encountered a cheater' : face === 'sleepy' ? 'pulled an all-nighter' : 'hit a sick trick shot'} in the ${background} arena${aura && aura !== 'none' ? ` while ${aura} mode was activated` : ''}. GG EZ!`,

      // Business & entrepreneurship themes
      `Entrepreneur spotlight! 💼 This ${body} CEO with the mind of a ${head}${accessory && accessory !== 'none' ? ` always seen with ${accessory}` : ''} is ${face === 'dead' ? 'pivoting after a setback' : face === 'smile' ? 'celebrating a successful exit' : face === 'annoyed' ? 'dealing with difficult investors' : face === 'sleepy' ? 'working around the clock' : 'disrupting the industry'} from their ${background} headquarters${aura && aura !== 'none' ? ` radiating ${aura} energy` : ''}. Hustle never stops!`,

      // Food & culture themes
      `Food critic review: ⭐ The legendary ${body} chef with a ${head}'s palate${accessory && accessory !== 'none' ? ` famous for their signature ${accessory}` : ''} ${face === 'dead' ? 'tried the spiciest challenge' : face === 'smile' ? 'created a masterpiece' : face === 'annoyed' ? 'dealt with a Karen customer' : face === 'sleepy' ? 'worked the night shift' : 'invented a new fusion cuisine'} in their ${background} restaurant${aura && aura !== 'none' ? ` with ${aura} ambiance` : ''}. Bone apple tea! 🍽️`,

      // Sports & fitness themes
      `Athletic achievement unlocked! 🏆 This ${body} athlete with the determination of a ${head}${accessory && accessory !== 'none' ? ` training with ${accessory}` : ''} just ${face === 'dead' ? 'gave it their all in defeat' : face === 'smile' ? 'broke a personal record' : face === 'annoyed' ? 'argued with the ref' : face === 'sleepy' ? 'pushed through exhaustion' : 'dominated the competition'} at the ${background} stadium${aura && aura !== 'none' ? ` with ${aura} intensity` : ''}. Beast mode activated!`,

      // Art & creativity themes
      `Featured artist spotlight! 🎨 Meet the ${body} artist with the vision of a ${head}${accessory && accessory !== 'none' ? ` known for incorporating ${accessory} into their work` : ''} who ${face === 'dead' ? 'poured their soul into their final piece' : face === 'smile' ? 'just had their gallery opening' : face === 'annoyed' ? 'is fighting creative block' : face === 'sleepy' ? 'works best in the late hours' : 'revolutionized their medium'} in their ${background} studio${aura && aura !== 'none' ? ` surrounded by ${aura} inspiration` : ''}. Art is life!`
    ];

    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    return randomTemplate;
  }, [state.selectedAssets]);

  // Load available assets immediately - no API calls!
  useEffect(() => {
    const assets: Record<string, Asset[]> = {};
    
    for (const layer of layers) {
      assets[layer] = getAssets(currentType, layer);
    }
    
    dispatch({ type: 'SET_AVAILABLE_ASSETS', payload: assets });
  }, [currentType, layers]);

  // Optimized render function - no flickering
  const renderNFT = useCallback(async (assets: Record<string, string> = state.selectedAssets, textSettings: TextSettings = state.textSettings) => {
    const canvas = canvasRef.current;
    if (!canvas || state.isRendering || Object.keys(assets).length === 0) {
      console.log('Skipping render - canvas:', !!canvas, 'isRendering:', state.isRendering, 'assets length:', Object.keys(assets).length);
      return;
    }

    console.log('Rendering NFT with assets:', assets);
    console.log('Rendering with text settings:', { topText: textSettings.topText, bottomText: textSettings.bottomText, fontSize: textSettings.fontSize, preset: textSettings.preset });
    dispatch({ type: 'SET_RENDERING', payload: true });
    
    try {
      // Create off-screen canvas
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = canvas.width;
      offscreenCanvas.height = canvas.height;
      const offscreenCtx = offscreenCanvas.getContext('2d');
      
      if (!offscreenCtx) return;

      // Load all images first
      const imagePromises = layers.map(async (layer) => {
        const assetPath = assets[layer];
        if (assetPath) {
          const img = new Image();
          return new Promise<{ layer: string; img: HTMLImageElement }>((resolve, reject) => {
            img.onload = () => {
              console.log(`Loaded image for ${layer}:`, assetPath);
              resolve({ layer, img });
            };
            img.onerror = (error) => {
              console.error(`Failed to load image for ${layer}:`, assetPath, error);
              reject(error);
            };
            img.src = assetPath;
          });
        }
        return null;
      });

      const loadedImages = await Promise.all(imagePromises);
      console.log('Loaded images:', loadedImages.filter(Boolean).length, 'out of', layers.length);
      
      // Render all layers at once
      loadedImages.forEach((imageData) => {
        if (imageData) {
          offscreenCtx.drawImage(imageData.img, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        }
      });

      // Add text with dynamic positioning
      const currentPreset = FONT_PRESETS.find(p => p.name === textSettings.preset) || FONT_PRESETS[0];
      
      if (textSettings.topText || textSettings.bottomText) {
        offscreenCtx.font = `bold ${textSettings.fontSize}px ${currentPreset.font}`;
        offscreenCtx.fillStyle = '#FFFFFF';
        offscreenCtx.strokeStyle = '#000000';
        offscreenCtx.lineWidth = Math.max(2, textSettings.fontSize / 20); // Dynamic stroke width
        offscreenCtx.textAlign = 'center';

        // Dynamic positioning based on font size
        const topMargin = Math.max(15, textSettings.fontSize * 0.6); // At least 15px from top
        const bottomMargin = Math.max(15, textSettings.fontSize * 0.4); // At least 15px from bottom

        if (textSettings.topText) {
          const topY = topMargin + (textSettings.fontSize * 0.8); // Position text baseline properly
          console.log(`Rendering top text: "${textSettings.topText}" at position ${topY}`);
          offscreenCtx.strokeText(textSettings.topText, offscreenCanvas.width / 2, topY);
          offscreenCtx.fillText(textSettings.topText, offscreenCanvas.width / 2, topY);
        }

        if (textSettings.bottomText) {
          const bottomY = offscreenCanvas.height - bottomMargin; // Position from bottom
          console.log(`Rendering bottom text: "${textSettings.bottomText}" at position ${bottomY}`);
          offscreenCtx.strokeText(textSettings.bottomText, offscreenCanvas.width / 2, bottomY);
          offscreenCtx.fillText(textSettings.bottomText, offscreenCanvas.width / 2, bottomY);
        }
      }

      // Copy to visible canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(offscreenCanvas, 0, 0);
        console.log('NFT rendered successfully');
      }
      
    } catch (error) {
      console.error('Failed to render NFT:', error);
    } finally {
      dispatch({ type: 'SET_RENDERING', payload: false });
    }
  }, [layers, state.isRendering, state.selectedAssets, state.textSettings]);

  // Generate random NFT - clean and simple
  const generateRandomNFT = useCallback(async () => {
    if (state.isGenerating || Object.keys(state.availableAssets).length === 0) {
      return;
    }
    
    dispatch({ type: 'SET_GENERATING', payload: true });
    
    const newAssets = generateRandomTraits(state.availableAssets);
    
    // Update selected assets immediately
    dispatch({ type: 'SET_SELECTED_ASSETS', payload: newAssets });
    
    // Render with new assets
    await renderNFT(newAssets);
    
    // Generate and set story
    const story = generateNFTStory(newAssets);
    dispatch({ type: 'SET_STORY', payload: story });
    
    dispatch({ type: 'INCREMENT_GENERATION_COUNT' });
    dispatch({ type: 'SET_GENERATING', payload: false });
  }, [state.availableAssets, state.isGenerating, renderNFT, generateNFTStory]);

  // Save to favorites
  const addToFavorites = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL();
    dispatch({ type: 'ADD_FAVORITE', payload: dataUrl });
  };

  // Share to Twitter
  const shareToTwitter = () => {
    const canvas = canvasRef.current;
    if (!canvas || !state.nftStory) return;

    // Convert canvas to blob and create object URL
    canvas.toBlob((blob) => {
      if (!blob) return;
      
      const imageUrl = URL.createObjectURL(blob);
      
      // Create a temporary link to download the image (Twitter doesn't support direct image upload via URL)
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `die-guys-nft-${Date.now()}.png`;
      link.click();
      
      // Open Twitter with the story text
      const tweetText = encodeURIComponent(`${state.nftStory}\n\n#DieGuys #NFT #Crypto #Web3 #WAGMI`);
      const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
      window.open(twitterUrl, '_blank');
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);
    }, 'image/png');
  };

  // Handle type change - fixed to wait for assets
  const handleTypeChange = useCallback(async (direction: number) => {
    console.log('handleTypeChange called, direction:', direction);
    
    if (state.isGenerating || state.isRendering) {
      console.log('Skipping type change - busy state');
      return;
    }

    const newIndex = (state.type + direction + NFT_TYPES.length) % NFT_TYPES.length;
    console.log('Changing to type index:', newIndex, 'type:', NFT_TYPES[newIndex]);
    
    dispatch({ type: 'SET_GENERATING', payload: true });
    
    const newType = NFT_TYPES[newIndex];
    const newLayers = LAYER_NAMES[newType as keyof typeof LAYER_NAMES];
    const newAvailableAssets: Record<string, Asset[]> = {};
    newLayers.forEach(layer => {
      newAvailableAssets[layer] = getAssets(newType, layer);
    });
    
    const newAssets = generateRandomTraits(newAvailableAssets);
    
    // Update all state immediately
    dispatch({ type: 'CHANGE_TYPE_COMPLETE', payload: { 
      typeIndex: newIndex, 
      availableAssets: newAvailableAssets, 
      selectedAssets: newAssets 
    }});
    
    // Render with new assets
    await renderNFT(newAssets);
    
    // Generate and set story
    const story = generateNFTStory(newAssets);
    dispatch({ type: 'SET_STORY', payload: story });
    
    dispatch({ type: 'INCREMENT_GENERATION_COUNT' });
    dispatch({ type: 'SET_GENERATING', payload: false });
  }, [state.type, state.isGenerating, state.isRendering, renderNFT, generateNFTStory]);

  // Initial generation on page load only
  useEffect(() => {
    if (Object.keys(state.availableAssets).length > 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      
      const generateInitialNFT = async () => {
        dispatch({ type: 'SET_GENERATING', payload: true });
        
        const newAssets = generateRandomTraits(state.availableAssets);
        
        // Update selected assets first
        dispatch({ type: 'SET_SELECTED_ASSETS', payload: newAssets });
        
        await renderNFT(newAssets);
        
        const story = generateNFTStory(newAssets);
        
        // Set loading to false after generation with minimum 1 second delay
        const startTime = Date.now();
        const minLoadingTime = 1000;
        
        setTimeout(() => {
          const elapsed = Date.now() - startTime;
          const remainingTime = Math.max(0, minLoadingTime - elapsed);
          setTimeout(() => {
            dispatch({ 
              type: 'COMPLETE_INITIAL_GENERATION', 
              payload: { assets: newAssets, story }
            });
          }, remainingTime);
        }, 100);
      };
      
      generateInitialNFT();
    }
  }, [state.availableAssets, renderNFT, generateNFTStory]);

  // Text inputs with onChange that triggers immediate re-render
  const handleTextChange = useCallback((field: keyof TextSettings, value: string | number) => {
    console.log(`Text changed - ${field}: "${value}"`);
    
    // Update state first
    dispatch({ type: 'UPDATE_TEXT', payload: { [field]: value } });
    
    // Immediate re-render with updated text settings
    if (Object.keys(state.selectedAssets).length > 0 && !state.isRendering) {
      const updatedTextSettings = { ...state.textSettings, [field]: value };
      console.log('Text changed, re-rendering NFT immediately with updated text:', updatedTextSettings);
      renderNFT(state.selectedAssets, updatedTextSettings);
    }
  }, [state.selectedAssets, state.isRendering, state.textSettings, renderNFT]);

  // Download NFT
  const downloadNFT = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `die-guys-${currentType.toLowerCase().replace(' ', '-')}-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Select asset - simplified
  const selectAsset = useCallback(async (asset: Asset) => {
    console.log('Selecting asset:', asset);
    
    const newAssets = {
      ...state.selectedAssets,
      [asset.category]: asset.path
    };
    
    // Update state immediately
    dispatch({ type: 'SELECT_TRAIT', payload: { layer: asset.category, assetPath: asset.path } });
    
    console.log('New assets after selection:', newAssets);
    await renderNFT(newAssets);
    
    // Generate and set story
    const story = generateNFTStory(newAssets);
    dispatch({ type: 'SET_STORY', payload: story });
  }, [state.selectedAssets, renderNFT, generateNFTStory]);

  // Get current asset name
  const getCurrentAssetName = (layer: string): string => {
    const assetPath = state.selectedAssets[layer];
    if (!assetPath) return 'None';
    const parts = assetPath.split('/');
    const filename = parts[parts.length - 1];
    return filename.replace('.png', '');
  };

  return (
    <>
      {/* Loading Screen Animation Styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          25% {
            transform: translateY(-10px) translateX(5px);
          }
          50% {
            transform: translateY(-5px) translateX(-5px);
          }
          75% {
            transform: translateY(-15px) translateX(3px);
          }
        }
      `}</style>

      {/* Loading Screen */}
      {state.isLoading && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'var(--bg-light)' }}>
          {/* Floating background elements for loading screen */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <div
                key={`loading-float-${i}`}
                className="absolute opacity-20"
                style={{
                  left: `${10 + (i % 4) * 20}%`,
                  top: `${10 + Math.floor(i / 4) * 30}%`,
                  animation: `float ${3 + (i % 3)}s ease-in-out infinite`,
                  animationDelay: `${i * 0.5}s`
                }}
              >
                <div 
                  className="w-8 h-8 rounded-full"
                  style={{ 
                    background: i % 4 === 0 ? 'var(--primary)' : 
                              i % 4 === 1 ? 'var(--secondary)' : 
                              i % 4 === 2 ? 'var(--tertiary)' : 'var(--quaternary)',
                    transform: `scale(${0.5 + (i % 3) * 0.3})`
                  }}
                />
              </div>
            ))}
          </div>
          
          <div className="text-center relative z-10">
            {/* Background Image */}
            <div 
              className="w-64 h-48 mx-auto mb-8 bg-cover bg-center"
              style={{
                backgroundImage: 'url(/bg.webp)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderColor: 'var(--primary)',
                filter: 'brightness(1.1) contrast(1.05)'
              }}
            />
            
            {/* Loading Icon */}
            <div className="mb-8">
              <div className="relative">
                <div 
                  className="inline-block animate-spin rounded-full h-20 w-20 border-0 relative"
                  style={{ 
                    background: `conic-gradient(from 0deg, var(--primary), var(--secondary), var(--tertiary), var(--quaternary), var(--primary))`,
                    borderRadius: '50%'
                  }}
                >
                  <div 
                    className="absolute inset-1 rounded-full"
                    style={{ background: 'var(--bg-light)' }}
                  />
                </div>
                {/* Sparkle effects */}
                <div className="absolute -top-2 -right-2 animate-pulse">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ background: 'var(--tertiary)', opacity: 0.8 }}
                  />
                </div>
                <div className="absolute -bottom-2 -left-2 animate-pulse" style={{ animationDelay: '0.5s' }}>
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ background: 'var(--secondary)', opacity: 0.6 }}
                  />
                </div>
              </div>
            </div>
            
            {/* Loading Text */}
            <div className="space-y-4">
              <h2 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-dark)' }}>
                <span className="inline-block animate-pulse">Die</span>
                <span className="inline-block animate-pulse mx-2" style={{ animationDelay: '0.2s' }}>Guys</span>
              </h2>
              <p className="text-2xl mb-4 font-semibold" style={{ color: 'var(--primary)' }}>NFT Creator</p>
              <div className="flex items-center justify-center gap-2 text-lg" style={{ color: 'var(--text-gray)' }}>
                <span className="animate-pulse">Generating your first NFT</span>
                <span className="animate-bounce">.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
              </div>
              <div className="text-sm mt-4" style={{ color: 'var(--secondary)' }}>
                <span className="font-medium">Infinite possibilities await</span>
              </div>
            </div>
          </div>
        </div>
      )}
    
      
      {/* Dynamic Gradient Overlay */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'linear-gradient(135deg, rgba(183, 183, 238, 0.08), rgba(209, 122, 111, 0.06), rgba(237, 131, 188, 0.08), rgba(209, 111, 157, 0.05))',
          zIndex: -1,
          animation: 'shimmer 20s ease-in-out infinite'
        }}
      />
      
      {/* Main Container */}
      <div className="min-h-screen flex justify-center items-center px-4 lg:px-8 py-4 lg:py-8">
        <div className="max-w-7xl w-full flex flex-col lg:flex-row gap-4 lg:gap-8">
          
          {/* Left Panel */}
          <div className="w-full lg:w-96 die-guys-card p-4 lg:p-8 h-fit order-2 lg:order-1">
            <div className="text-center mb-6 lg:mb-8">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-2 hover:scale-105 transition-transform duration-300">Die Guys</h1>
              <h2 className="text-lg lg:text-xl font-semibold mb-3" style={{ color: 'var(--primary)' }}>NFT CREATOR</h2>
              
              {/* Stats Bar */}
              <div className="flex justify-center gap-4 text-sm">
                <div className="flex items-center gap-1 bg-white rounded-full px-3 py-1 shadow-sm">
                  <Sparkles size={14} style={{ color: 'var(--primary)' }} />
                  <span className="font-medium">{state.generationCount}</span>
                </div>
                <div className="flex items-center gap-1 bg-white rounded-full px-3 py-1 shadow-sm">
                  <Heart size={14} style={{ color: 'var(--secondary)' }} />
                  <span className="font-medium">{state.favorites.length}</span>
                </div>
              </div>
            </div>

            {/* Type Selector */}
            <div className="mb-6 lg:mb-8 die-guys-card p-3 lg:p-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleTypeChange(-1)}
                  disabled={state.isGenerating || state.isRendering}
                  className="p-2 lg:p-3 bg-white border-2 border-gray-300 hover:border-purple-400 rounded-xl transition-all duration-300 hover:scale-110 disabled:opacity-50"
                >
                  <ChevronLeft size={18} style={{ color: 'var(--primary)' }} />
                </button>
                <span className="font-bold text-gray-800 text-center flex-1 mx-2 lg:mx-4 flex items-center justify-center text-sm lg:text-base">
                  {currentType}
                  {state.isGenerating && (
                    <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                  )}
                </span>
                <button
                  onClick={() => handleTypeChange(1)}
                  disabled={state.isGenerating || state.isRendering}
                  className="p-2 lg:p-3 bg-white border-2 border-gray-300 hover:border-purple-400 rounded-xl transition-all duration-300 hover:scale-110 disabled:opacity-50"
                >
                  <ChevronRight size={18} style={{ color: 'var(--primary)' }} />
                </button>
              </div>
            </div>

            {/* Trait Folders */}
            <div className="space-y-3 lg:space-y-4 mb-4 lg:mb-6">
              {layers.map((layer, index) => (
                <div
                  key={layer}
                  onClick={() => {
                    dispatch({ type: 'SET_SELECTED_LAYER', payload: layer });
                    dispatch({ type: 'SET_SHOW_MODAL', payload: true });
                  }}
                  className="asset-item p-3 lg:p-4 cursor-pointer group relative overflow-hidden"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center space-x-2 lg:space-x-3 relative z-10">
                    <div className="relative">
                      <Folder size={20} style={{ color: 'var(--secondary)' }} />
                      {/* Subtle glow effect on hover */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-sm"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-800 group-hover:text-purple-600 transition-colors duration-500 text-sm lg:text-base">{layer}</div>
                      <div className="text-xs lg:text-sm group-hover:text-gray-600 transition-colors duration-500 truncate" style={{ color: 'var(--text-gray)' }}>
                        {getCurrentAssetName(layer)}
                      </div>
                    </div>
                    <div className="text-xs bg-gray-100 px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 hidden sm:block">
                      {state.availableAssets[layer]?.length || 0} options
                    </div>
                  </div>
                  
                  {/* Subtle hover background effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-pink-50 opacity-0 group-hover:opacity-60 transition-opacity duration-500 rounded-lg"></div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mb-6">
              <button
                onClick={generateRandomNFT}
                disabled={state.isGenerating || state.isRendering}
                className="w-full secondary-button flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <RotateCcw size={18} className={state.isGenerating || state.isRendering ? 'animate-spin' : ''} />
                <span>
                  Random Traits
                </span>
              </button>
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex-1 flex flex-col gap-4 lg:gap-6 order-1 lg:order-2">
            
            {/* Preview Canvas */}
            <div className="die-guys-card p-4 lg:p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg lg:text-xl font-bold text-gray-800">Preview</h3>
                <div className="flex gap-2">
                  <button
                    onClick={addToFavorites}
                    className="p-2 bg-white border-2 border-gray-300 hover:border-red-400 rounded-lg transition-all duration-300 hover:scale-110"
                    title="Add to Favorites"
                  >
                    <Heart size={18} style={{ color: 'var(--secondary)' }} />
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'SET_SHOW_STATS', payload: !state.showStats })}
                    className="p-2 bg-white border-2 border-gray-300 hover:border-purple-400 rounded-lg transition-all duration-300 hover:scale-110"
                    title="Show Stats"
                  >
                    <BarChart3 size={18} style={{ color: 'var(--primary)' }} />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-center relative">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={500}
                  className="preview-canvas transition-transform duration-300 hover:scale-[1.02] w-full h-auto max-w-[min(500px,100vw-2rem)] max-h-[min(500px,70vh)]"
                  style={{ aspectRatio: '1/1' }}
                />
              </div>
              
              {/* Stats Panel */}
              {state.showStats && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-bold text-sm mb-2">Current NFT Stats</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Type: <span className="font-medium">{currentType}</span></div>
                    <div>Layers: <span className="font-medium">{layers.length}</span></div>
                    <div>Generated: <span className="font-medium">{state.generationCount}</span></div>
                    <div>Favorites: <span className="font-medium">{state.favorites.length}</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Text Controls */}
            <div className="die-guys-card p-4 lg:p-8 space-y-4 lg:space-y-6">
              <div className="text-center mb-4 lg:mb-6">
                <h3 className="text-lg lg:text-xl font-bold text-gray-800">Text Overlay</h3>
                <span className="text-sm" style={{ color: 'var(--primary)' }}>{state.textSettings.preset} Style</span>
              </div>

              <div className="space-y-3 lg:space-y-4">
                <input
                  type="text"
                  placeholder="Top Text"
                  value={state.textSettings.topText}
                  onChange={(e) => handleTextChange('topText', e.target.value)}
                  className="input-field"
                />

                <input
                  type="text"
                  placeholder="Bottom Text"
                  value={state.textSettings.bottomText}
                  onChange={(e) => handleTextChange('bottomText', e.target.value)}
                  className="input-field"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Font Style</label>
                    <select
                      value={state.textSettings.preset}
                      onChange={(e) => handleTextChange('preset', e.target.value)}
                      className="input-field"
                    >
                      {FONT_PRESETS.map((preset) => (
                        <option key={preset.name} value={preset.name}>
                          {preset.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                    <select
                      value={state.textSettings.fontSize}
                      onChange={(e) => handleTextChange('fontSize', parseInt(e.target.value))}
                      className="input-field"
                    >
                      <option value={24}>Small (24px)</option>
                      <option value={32}>Medium (32px)</option>
                      <option value={40}>Large (40px)</option>
                      <option value={48}>Extra Large (48px)</option>
                      <option value={56}>XXL (56px)</option>
                      <option value={64}>XXXL (64px)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                  <button
                    onClick={downloadNFT}
                    className="control-button flex items-center justify-center space-x-2"
                  >
                    <Download size={18} />
                    <span>Download NFT</span>
                  </button>
                  
                  <button
                    onClick={addToFavorites}
                    className="secondary-button flex items-center justify-center space-x-2"
                  >
                    <Heart size={18} />
                    <span>Save Favorite</span>
                  </button>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const updatedTextSettings = { ...state.textSettings, topText: 'DIE GUYS', bottomText: 'NFT' };
                      console.log('Sample Text clicked, updating to:', updatedTextSettings);
                      dispatch({ type: 'UPDATE_TEXT', payload: { topText: 'DIE GUYS', bottomText: 'NFT' } });
                      renderNFT(state.selectedAssets, updatedTextSettings);
                    }}
                    className="flex-1 text-xs py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-300"
                  >
                    Sample Text
                  </button>
                  <button
                    onClick={() => {
                      const updatedTextSettings = { ...state.textSettings, topText: '', bottomText: '' };
                      console.log('Clear Text clicked, updating to:', updatedTextSettings);
                      dispatch({ type: 'UPDATE_TEXT', payload: { topText: '', bottomText: '' } });
                      renderNFT(state.selectedAssets, updatedTextSettings);
                    }}
                    className="flex-1 text-xs py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-300"
                  >
                    Clear Text
                  </button>
                </div>
              </div>
            </div>

            {/* NFT Story & Sharing */}
            {state.nftStory && (
              <div className="die-guys-card p-4 lg:p-8 space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg lg:text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
                    <Sparkles size={18} style={{ color: 'var(--tertiary)' }} />
                    Die Guys Story
                  </h3>
                  <span className="text-sm text-gray-500">Auto-generated based on your NFT</span>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 lg:p-6 rounded-xl border-2 border-purple-200">
                  <p className="text-gray-800 leading-relaxed font-medium text-center italic text-sm lg:text-base">
                    &quot;{state.nftStory}&quot;
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      const story = generateNFTStory();
                      dispatch({ type: 'SET_STORY', payload: story });
                    }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 hover:scale-105"
                  >
                    <RefreshCw size={16} />
                    <span>New Story</span>
                  </button>
                  
                  <button
                    onClick={shareToTwitter}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 hover:scale-105 shadow-lg"
                  >
                    <Twitter size={16} />
                    <span>Share on X</span>
                  </button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Clicking &quot;Share on X&quot; will download your NFT and open Twitter with the story
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Favorites Panel */}
      {state.favorites.length > 0 && (
        <div className="fixed bottom-4 right-4 die-guys-card p-4 max-w-md">
          <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
            <Heart size={16} style={{ color: 'var(--secondary)' }} />
            Recent Favorites
          </h4>
          <div className="flex gap-2 overflow-x-auto">
            {state.favorites.map((fav, index) => (
              <NextImage
                key={index}
                src={fav}
                alt={`Favorite ${index + 1}`}
                width={64}
                height={64}
                className="w-16 h-16 rounded-lg object-cover border-2 border-gray-200 hover:border-purple-400 transition-all duration-300 hover:scale-110 cursor-pointer"
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = `die-guys-favorite-${index + 1}-${Date.now()}.png`;
                  link.href = fav;
                  link.click();
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {state.showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-overlay p-4">
          <div className="die-guys-card p-4 lg:p-8 m-4 max-w-4xl w-full max-h-[80vh] overflow-y-auto modal-content">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h3 className="text-lg lg:text-2xl font-bold text-gray-800">Select {state.selectedLayer}</h3>
              <button
                onClick={() => dispatch({ type: 'SET_SHOW_MODAL', payload: false })}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:scale-110"
              >
                <X size={20} style={{ color: 'var(--text-gray)' }} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
              {(state.availableAssets[state.selectedLayer] || []).map((asset, index) => (
                <div
                  key={index}
                  onClick={() => selectAsset(asset)}
                  className={`asset-item p-3 lg:p-4 text-center cursor-pointer transition-all duration-500 hover:scale-102 group ${
                    state.selectedAssets[asset.category] === asset.path ? 'selected' : ''
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="w-full h-16 lg:h-24 bg-gray-100 rounded-lg mb-2 lg:mb-3 flex items-center justify-center overflow-hidden relative">
                    <NextImage
                      src={asset.path}
                      alt={asset.name}
                      width={96}
                      height={96}
                      className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105"
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = `<span class="text-gray-400 text-xs">${asset.name}</span>`;
                      }}
                    />
                    {/* Subtle hover overlay */}
                    <div className="absolute inset-0 bg-purple-100 opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-lg"></div>
                  </div>
                  <div className="text-xs lg:text-sm font-medium text-gray-700 group-hover:text-purple-600 transition-colors duration-500 truncate">{asset.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Footer */}
      <div className="text-center py-12 px-4" style={{ background: 'linear-gradient(135deg, var(--bg-light), rgba(255,255,255,0.9))' }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center gap-8 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>{state.generationCount}</div>
              <div className="text-xs text-gray-500">NFTs Generated</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: 'var(--secondary)' }}>{state.favorites.length}</div>
              <div className="text-xs text-gray-500">Favorites Saved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: 'var(--tertiary)' }}>{Object.keys(state.availableAssets).reduce((acc, layer) => acc + (state.availableAssets[layer]?.length || 0), 0)}</div>
              <div className="text-xs text-gray-500">Total Assets</div>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 mb-4">
            Die Guys NFT Creator • Built with Next.js & Canvas API • Made with 💜 by <a href="https://x.com/0x_groot">Groot</a>
          </p>
          
          <div className="flex justify-center gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Palette size={14} />
              <span>Infinite Combinations</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Sparkles size={14} />
              <span>AI-Powered Generation</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Download size={14} />
              <span>High-Quality Export</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
