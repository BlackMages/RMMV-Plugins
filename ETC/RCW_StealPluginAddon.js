/*:
 * @help Addon for RCWizard Steal Plugin
 *
 * This addon requires RCWizard Steal Plugin, which can be found here:
 * https://forums.rpgmakerweb.com/index.php?threads/easy-steal-skill-plugin.56079/
 *	
 * Put this plugin below the Steal Plugin.
 *	
 * What this addon do?
 * The original Steal Plugin only steals from item database. This addon makes it possible
 * to steal from the weapon and armor database.
 *	
 * Credits: 
 * RCWizard for creating the Steal Plugin.
 * Black Mage for making the addon.
*/

function Stealable(itemId, num, percent, i_type) {
    this._itemId = itemId || 0;    
    this._num = num || 0;
    this._percent = (percent || 0);
	this._type = i_type || 0;
};

Stealable.prototype.canSteal = function() {
  return this._num > 0;
};

Stealable.prototype.steal = function(modifier) {
  var rand = Math.random();
  // use $gameMessage.add('') here to debug steal math and item entry
  if ((this._num > 0 )&& (rand > (1.0-(this._percent+modifier)*0.01))) {
    this._num -= 1;
    return this._itemId;
  }
  return 0;
};

function Stealable_Handler() {this.initialize()};

Stealable_Handler.prototype.initialize = function() {
  this._stealable = [];
  this._stolen = [];
};

Stealable_Handler.prototype.add = function(itemId, num, percent, type) {
    if (itemId > 0) {
        var stealable = new Stealable(itemId, num, percent, type);
        this._stealable.push(stealable);
    }
};

Stealable_Handler.prototype.canSteal = function() {
    for (n = 0; n < this._stealable.length; n++) {
        if(this._stealable[n].canSteal()) {
            return true;
        }
    }
    return false;
};

Stealable_Handler.prototype.stealOne = function(modifier) {
        var ids = [];
        var id = 0;
        for (n = 0; n < this._stealable.length; n++) {
            id = this._stealable[n].steal(modifier);
            if(id > 0) {
                ids.push([id,this._stealable[n]._type]);
                break;
            }
        }
        return ids;
};

Stealable_Handler.prototype.stealAll = function(modifier) {
        var ids = [];
        var id;
        for (n = 0; n < this._stealable.length; n++) {
            id = this._stealable[n].steal(modifier);
            if(id > 0) {
                ids.push([id,this._stealable[n]._type]);
            }
        }
        return ids;
};

StealPluginLoader.prototype.parseEnemies = function () {
    var noteS1 = /<(?:STEALABLE)>/i;
    var noteS2 = /<\/(?:STEALABLE)>/i;
    var enemies = $dataEnemies;
    for (var n = 1; n < enemies.length; n++) {
        var obj = enemies[n];
        var notedata = obj.note.split(/[\r\n]+/);
        obj.stealable = [];
        for (var i = 0; i < notedata.length; i++) {
            var line = notedata[i];
            if (line.match(noteS1)) {
               for(var j=i+1; j < notedata.length; j++) {
                    line = notedata[j];
                    if (line.match(noteS2)) {
                       break;
                    }
                    var res = line.split(',');
                    var itemName = res[0];
                    var num = Number(res[1] || 0);
                    var per = Number(res[2] || 0);
					//item check
                    var id = 0;
					var i_type = 0;
                    for(var k = 0; k < $dataItems.length; k++) {
                        var item = $dataItems[k];
                        if (item && ( item.name == itemName)) {
                            id = k;
							i_type = 0;
                            break;
                        }
                    }
					//weapon check
                    for(var k = 0; k < $dataWeapons.length; k++) {
                        var item = $dataWeapons[k];
                        if (item && ( item.name == itemName)) {
                            id = k;
							i_type = 1;
                            break;
                        }
                    }
					
					//armor check
                    for(var k = 0; k < $dataArmors.length; k++) {
                        var item = $dataArmors[k];
                        if (item && ( item.name == itemName)) {
                            id = k;
							i_type = 2;
                            break;
                        }
                    }
					
                    if (id != 0) {
                        obj.stealable.push(new Stealable(id, num, per, i_type));
                    }
               }
            } 
        }
    }
};

Window_BattleLog.prototype.displaySteal = function(target) {
    if (!target.result().robbed) {
        return;
    }
    if(target.result().robmissed) {
        this.push('addText', TextManager.stealMiss.format(target.name()));   
        return;
    }
    var stolenItems = target.result().stolen;
    if (stolenItems.length == 0) {
        this.push('addText', TextManager.stealNothing.format(target.name()));   
        return;
    }
    for(n = 0; n < stolenItems.length; n++) {
		switch(stolenItems[n][1]){
		case 1:
			this.push('addText', TextManager.stealSuccess.format($dataWeapons[stolenItems[n][0]].name, target.name()));
			break;
		case 2:
			this.push('addText', TextManager.stealSuccess.format($dataArmors[stolenItems[n][0]].name, target.name()));
			break;
		default:
			this.push('addText', TextManager.stealSuccess.format($dataItems[stolenItems[n][0]].name, target.name()));
		}
    }        
    return;
};

Game_Action.prototype.itemEffectSteal = function(target,effect,stealall) {
    // go through target and roll against per chance to steal items
    // check to see if there is anything to steal
    target.result().robbed = true;
    if (target.canSteal()) {       
        var stolenItems;
        if (!stealall) {
            stolenItems = target.stealOne(effect.percentModifier);            
        }
        else {
            stolenItems = target.stealAll(effect.percentModifier);
        }
        if (stolenItems.length == 0) {
            target.result().robmissed = true;
        }
        for (var n = 0; n < stolenItems.length; n++) {
            target.result().stolen.push(stolenItems[n]);
			switch(stolenItems[n][1]){
				case 1:
				    $gameParty.gainItem($dataWeapons[stolenItems[n][0]],1);
					break;
				case 2:
				    $gameParty.gainItem($dataArmors[stolenItems[n][0]],1);
					break;
				default:
					$gameParty.gainItem($dataItems[stolenItems[n][0]],1);				
			}
        }
    }
    this.makeSuccess(target);
};

Game_Enemy.prototype.recoverAll2 = function() {
    this.recoverAllOrg();
    this.stealable = new Stealable_Handler();
    for(n = 0; n < this.enemy().stealable.length; n++)
    {
        var stealItem = this.enemy().stealable[n];
        this.stealable.add(stealItem._itemId, stealItem._num, stealItem._percent, stealItem._type);
    }    
}
Game_Enemy.prototype.recoverAll = Game_Enemy.prototype.recoverAll2;

Game_Action.prototype.applyItemEffect2 = function(target, effect) {
    this.applyItemEffectOrg(target, effect);
    switch (effect.code) {
    case Game_Action.EFFECT_STEAL_ONE:      
        this.itemEffectSteal(target, effect, false);
        break;
    case Game_Action.EFFECT_STEAL_ALL:
        this.itemEffectSteal(target, effect, true);
        break;
    }
};
Game_Action.prototype.applyItemEffect = Game_Action.prototype.applyItemEffect2;
