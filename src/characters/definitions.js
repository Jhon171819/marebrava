export const nilo = Object.freeze({
  name: 'Nilo', scale: 1.07,
  palette: { coat: '#c87351', shade: '#95583f', skin: '#e4b184', pants: '#354840', boots: '#a3885b', hair: '#2a3f33', scarf: '#e2ba75' },
});

// Copy this definition, not the renderer. Characters with the same palette share an atlas.
export const characterTemplate = {
  name: 'Marinheira', scale: 1.07,
  palette: { ...nilo.palette, coat: '#55878a', shade: '#365b62', scarf: '#e5cc99' },
};
