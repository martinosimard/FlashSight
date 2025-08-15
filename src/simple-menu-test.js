/**
 * Test simple de menu contextuel
 */
function createSimpleTestMenu() {
    console.log('Test: Création d\'un menu contextuel ultra-simple');
    
    // Supprimer tout menu existant
    const existing = document.getElementById('simple-test-menu');
    if (existing) existing.remove();
    
    // Créer un menu très simple
    const menu = document.createElement('div');
    menu.id = 'simple-test-menu';
    menu.innerHTML = `
        <div style="padding: 10px; background: yellow; border: 2px solid red;">Action 1</div>
        <div style="padding: 10px; background: yellow; border: 2px solid red;">Action 2</div>
        <div style="padding: 10px; background: yellow; border: 2px solid red;">Action 3</div>
    `;
    
    // Styles inline très basiques
    menu.style.position = 'fixed';
    menu.style.top = '100px';
    menu.style.left = '100px';
    menu.style.background = 'white';
    menu.style.border = '5px solid green';
    menu.style.zIndex = '999999';
    menu.style.width = '150px';
    menu.style.height = '150px';
    menu.style.display = 'block';
    
    document.body.appendChild(menu);
    console.log('Test: Menu ultra-simple créé:', menu);
    
    return menu;
}

// Ajouter un bouton de test global
const testBtn2 = document.createElement('button');
testBtn2.textContent = 'Test Menu SIMPLE';
testBtn2.style.position = 'fixed';
testBtn2.style.top = '50px';
testBtn2.style.right = '10px';
testBtn2.style.zIndex = '9999';
testBtn2.style.background = 'orange';
testBtn2.style.color = 'black';
testBtn2.style.border = 'none';
testBtn2.style.padding = '5px 10px';
testBtn2.style.borderRadius = '3px';
testBtn2.style.cursor = 'pointer';

testBtn2.onclick = () => {
    createSimpleTestMenu();
};

document.body.appendChild(testBtn2);
console.log('Test: Bouton de test simple ajouté');
