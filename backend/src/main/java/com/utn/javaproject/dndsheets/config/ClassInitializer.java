package com.utn.javaproject.dndsheets.config;

import com.utn.javaproject.dndsheets.domain.entities.DndClassEntity;
import com.utn.javaproject.dndsheets.repositories.DndClassRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;

@Component
@Order(2)
public class ClassInitializer implements CommandLineRunner {

    private final DndClassRepository dndClassRepository;

    public ClassInitializer(DndClassRepository dndClassRepository) {
        this.dndClassRepository = dndClassRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        // Keeps the Hibernate session open for the whole method: the update
        // branch below reads a lazy collection (savingThrows) on an entity
        // fetched earlier in the same run, which otherwise fails with
        // LazyInitializationException once the per-call session closes.
        List<DndClassSeed> seeds = List.of(
                createArtificer(),
                createBarbarian(),
                createBard(),
                createCleric(),
                createDruid(),
                createFighter(),
                createMonk(),
                createPaladin(),
                createRanger(),
                createRogue(),
                createSorcerer(),
                createWarlock(),
                createWizard()
        );

        for (DndClassSeed seed : seeds) {
            if (dndClassRepository.existsByName(seed.name())) {
                // UPDATE existing class if savingThrows is missing
                dndClassRepository.findByName(seed.name()).ifPresent(existing -> {
                    if (existing.getSavingThrows() == null || existing.getSavingThrows().isEmpty()) {
                        existing.setSavingThrows(seed.savingThrows());
                        dndClassRepository.save(existing);
                    }
                });
                continue;
            }

            DndClassEntity entity = new DndClassEntity();
            entity.setName(seed.name());
            entity.setHitDice(seed.hitDice());
            entity.setLevelCharacteristics(seed.levelCharacteristics());
            entity.setSavingThrows(seed.savingThrows());

            try {
                dndClassRepository.save(entity);
            } catch (DataIntegrityViolationException ex) {
                // Handles concurrent startup races: another instance may have inserted the same name.
            }
        }
    }

    private DndClassSeed createArtificer() {
        HashMap<Short, String> chars = new HashMap<>();
        chars.put((short) 1, "Magical Tinkering\nYou learn how to invest a spark of magic into mundane objects. Touching a Tiny nonmagical object, you can give it one of the following magical properties: emit light, emit a recorded message, emit an odor or sound, or display a static visual effect.");
        chars.put((short) 1, "Spellcasting\nYou have studied the workings of magic and how to channel it through objects. You can cast artificer spells using Intelligence as your spellcasting ability.");
        chars.put((short) 2, "Infuse Item\nYou gain the ability to imbue mundane items with certain magical infusions. At the end of a long rest, you can touch a nonmagical object and imbue it with one of your artificer infusions.");
        chars.put((short) 6, "Tool Expertise\nYour proficiency bonus is doubled for any ability check you make that uses your proficiency with a tool.");
        chars.put((short) 7, "Flash of Genius\nYou gain the ability to come up with solutions under pressure. When you or another creature you can see within 30 feet makes an ability check or a saving throw, you can use your reaction to add your Intelligence modifier to the roll.");
        chars.put((short) 10, "Magic Item Adept\nYou achieve a profound understanding of how to use and make magic items. You can attune to up to four magic items at once, and crafting magic items takes you a quarter of the normal time.");
        chars.put((short) 11, "Spell-Storing Item\nYou learn how to store a spell in an object. Whenever you finish a long rest, you can touch one simple or martial weapon or one item that you can use as a spellcasting focus and store a spell in it.");
        chars.put((short) 14, "Magic Item Savant\nYour skill with magic items deepens. You can attune to up to five magic items at once, and you ignore all class, race, spell, and level requirements on attuning to or using a magic item.");
        chars.put((short) 18, "Magic Item Master\nYou can attune to up to six magic items at once.");
        chars.put((short) 20, "Soul of Artifice\nYou develop a mystical connection to your magic items. You gain a +1 bonus to all saving throws per magic item you are currently attuned to. If you're reduced to 0 hit points but not killed outright, you can end one of your artificer infusions to drop to 1 hit point instead.");
        return new DndClassSeed("Artificer", 8, chars, List.of("Constitution", "Intelligence"));
    }

    private DndClassSeed createBarbarian() {
        HashMap<Short, String> chars = new HashMap<>();
        chars.put((short) 1, "Rage\nIn battle, you fight with primal ferocity. On your turn, you can enter a rage as a bonus action. While raging, you gain advantage on Strength checks and saving throws, bonus damage on melee attacks, and resistance to bludgeoning, piercing, and slashing damage.");
        chars.put((short) 1, "Unarmored Defense\nWhile you are not wearing any armor, your Armor Class equals 10 + your Dexterity modifier + your Constitution modifier. You can use a shield and still gain this benefit.");
        chars.put((short) 2, "Reckless Attack\nYou can throw aside all concern for defense to attack with fierce desperation. When you make your first attack on your turn, you can decide to attack recklessly, giving you advantage on melee weapon attack rolls using Strength, but attack rolls against you have advantage until your next turn.");
        chars.put((short) 2, "Danger Sense\nYou gain an uncanny sense of when things nearby aren't as they should be. You have advantage on Dexterity saving throws against effects that you can see, such as traps and spells, as long as you are not blinded, deafened, or incapacitated.");
        chars.put((short) 5, "Extra Attack\nYou can attack twice, instead of once, whenever you take the Attack action on your turn.");
        chars.put((short) 5, "Fast Movement\nYour speed increases by 10 feet while you aren't wearing heavy armor.");
        chars.put((short) 7, "Feral Instinct\nYour instincts are so honed that you have advantage on initiative rolls. Additionally, if you are surprised at the beginning of combat and aren't incapacitated, you can act normally on your first turn if you enter your rage before doing anything else.");
        chars.put((short) 9, "Brutal Critical\nYou can roll one additional weapon damage die when determining the extra damage for a critical hit with a melee attack. This increases to two additional dice at 13th level and three additional dice at 17th level.");
        chars.put((short) 11, "Relentless Rage\nYour rage can keep you fighting despite grievous wounds. If you drop to 0 hit points while raging and don't die outright, you can make a DC 10 Constitution saving throw. If you succeed, you drop to 1 hit point instead.");
        chars.put((short) 15, "Persistent Rage\nYour rage is so fierce that it ends early only if you fall unconscious or if you choose to end it.");
        chars.put((short) 18, "Indomitable Might\nIf your total for a Strength check is less than your Strength score, you can use that score in place of the total.");
        chars.put((short) 20, "Primal Champion\nYou embody the power of the wilds. Your Strength and Constitution scores increase by 4. Your maximum for those scores is now 24.");
        return new DndClassSeed("Barbarian", 12, chars, List.of("Strength", "Constitution"));
    }

    private DndClassSeed createBard() {
        HashMap<Short, String> chars = new HashMap<>();
        chars.put((short) 1, "Spellcasting\nYou have learned to untangle and reshape the fabric of reality in harmony with your wishes and music. You can cast bard spells using Charisma as your spellcasting ability.");
        chars.put((short) 1, "Bardic Inspiration\nYou can inspire others through stirring words or music. As a bonus action, you can give one creature within 60 feet a Bardic Inspiration die (d6). The creature can add it to one ability check, attack roll, or saving throw within 10 minutes.");
        chars.put((short) 2, "Jack of All Trades\nYou can add half your proficiency bonus, rounded down, to any ability check you make that doesn't already include your proficiency bonus.");
        chars.put((short) 2, "Song of Rest\nYou can use soothing music or oration to help revitalize your wounded allies during a short rest. If you or any friendly creatures regain hit points by spending Hit Dice, each of those creatures regains an extra 1d6 hit points.");
        chars.put((short) 3, "Expertise\nChoose two of your skill proficiencies. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies.");
        chars.put((short) 5, "Bardic Inspiration (d8)\nYour Bardic Inspiration die becomes a d8.");
        chars.put((short) 5, "Font of Inspiration\nYou regain all of your expended uses of Bardic Inspiration when you finish a short or long rest.");
        chars.put((short) 6, "Countercharm\nYou gain the ability to use musical notes or words of power to disrupt mind-influencing effects. As an action, you can start a performance that lasts until the end of your next turn. During that time, you and friendly creatures within 30 feet have advantage on saving throws against being frightened or charmed.");
        chars.put((short) 10, "Bardic Inspiration (d10)\nYour Bardic Inspiration die becomes a d10.");
        chars.put((short) 10, "Expertise\nChoose two more of your skill proficiencies to gain the benefit of Expertise.");
        chars.put((short) 10, "Magical Secrets\nYou have plundered magical knowledge from a wide spectrum of disciplines. Choose two spells from any classes, including this one. The chosen spells count as bard spells for you.");
        chars.put((short) 14, "Magical Secrets\nYou learn two additional spells from any classes.");
        chars.put((short) 15, "Bardic Inspiration (d12)\nYour Bardic Inspiration die becomes a d12.");
        chars.put((short) 18, "Magical Secrets\nYou learn two additional spells from any classes.");
        chars.put((short) 20, "Superior Inspiration\nWhen you roll initiative and have no uses of Bardic Inspiration left, you regain one use.");
        return new DndClassSeed("Bard", 8, chars, List.of("Dexterity", "Charisma"));
    }

    private DndClassSeed createCleric() {
        HashMap<Short, String> chars = new HashMap<>();
        chars.put((short) 1, "Spellcasting\nAs a conduit for divine power, you can cast cleric spells using Wisdom as your spellcasting ability. You prepare the list of cleric spells that are available for you to cast, choosing from the cleric spell list.");
        chars.put((short) 2, "Channel Divinity\nYou gain the ability to channel divine energy directly from your deity. You start with the Turn Undead effect. When you use your Channel Divinity, you choose which effect to create.");
        chars.put((short) 2, "Channel Divinity: Turn Undead\nAs an action, you present your holy symbol and speak a prayer censuring the undead. Each undead within 30 feet that can see or hear you must make a Wisdom saving throw. On a failed save, the creature is turned for 1 minute or until it takes any damage.");
        chars.put((short) 5, "Destroy Undead (CR 1/2)\nWhen an undead fails its saving throw against your Turn Undead feature, the creature is instantly destroyed if its challenge rating is 1/2 or lower.");
        chars.put((short) 6, "Channel Divinity (2/rest)\nYou can use your Channel Divinity twice between rests.");
        chars.put((short) 8, "Destroy Undead (CR 1)\nWhen an undead fails its saving throw against your Turn Undead feature, the creature is instantly destroyed if its challenge rating is 1 or lower.");
        chars.put((short) 10, "Divine Intervention\nYou can call on your deity to intervene on your behalf when your need is great. As an action, describe the assistance you seek, and roll percentile dice. If you roll a number equal to or lower than your cleric level, your deity intervenes.");
        chars.put((short) 11, "Destroy Undead (CR 2)\nWhen an undead fails its saving throw against your Turn Undead feature, the creature is instantly destroyed if its challenge rating is 2 or lower.");
        chars.put((short) 14, "Destroy Undead (CR 3)\nWhen an undead fails its saving throw against your Turn Undead feature, the creature is instantly destroyed if its challenge rating is 3 or lower.");
        chars.put((short) 17, "Destroy Undead (CR 4)\nWhen an undead fails its saving throw against your Turn Undead feature, the creature is instantly destroyed if its challenge rating is 4 or lower.");
        chars.put((short) 18, "Channel Divinity (3/rest)\nYou can use your Channel Divinity three times between rests.");
        chars.put((short) 20, "Divine Intervention Improvement\nYour call for intervention succeeds automatically, no roll required.");
        return new DndClassSeed("Cleric", 8, chars, List.of("Wisdom", "Charisma"));
    }

    private DndClassSeed createDruid() {
        HashMap<Short, String> chars = new HashMap<>();
        chars.put((short) 1, "Druidic\nYou know Druidic, the secret language of druids. You can speak the language and use it to leave hidden messages. You and others who know this language automatically spot such a message.");
        chars.put((short) 1, "Spellcasting\nDrawing on the divine essence of nature itself, you can cast druid spells using Wisdom as your spellcasting ability.");
        chars.put((short) 2, "Wild Shape\nYou can use your action to magically assume the shape of a beast that you have seen before. You can use this feature twice, and you regain expended uses when you finish a short or long rest.");
        chars.put((short) 4, "Wild Shape Improvement\nYou can transform into a beast with a challenge rating as high as 1/2 (no flying speed).");
        chars.put((short) 8, "Wild Shape Improvement\nYou can transform into a beast with a challenge rating as high as 1.");
        chars.put((short) 18, "Timeless Body\nThe primal magic that you wield causes you to age more slowly. For every 10 years that pass, your body ages only 1 year.");
        chars.put((short) 18, "Beast Spells\nYou can cast many of your druid spells in any shape you assume using Wild Shape. You can perform the somatic and verbal components of a druid spell while in a beast shape, but you aren't able to provide material components.");
        chars.put((short) 20, "Archdruid\nYou can use your Wild Shape an unlimited number of times. Additionally, you can ignore the verbal and somatic components of your druid spells, as well as any material components that lack a cost and aren't consumed by a spell.");
        return new DndClassSeed("Druid", 8, chars, List.of("Intelligence", "Wisdom"));
    }

    private DndClassSeed createFighter() {
        HashMap<Short, String> chars = new HashMap<>();
        chars.put((short) 1, "Fighting Style\nYou adopt a particular style of fighting as your specialty. Choose one fighting style option. You can't take a Fighting Style option more than once, even if you later get to choose again.");
        chars.put((short) 1, "Second Wind\nYou have a limited well of stamina that you can draw on to protect yourself from harm. On your turn, you can use a bonus action to regain hit points equal to 1d10 + your fighter level. Once you use this feature, you must finish a short or long rest before you can use it again.");
        chars.put((short) 2, "Action Surge\nYou can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action. Once you use this feature, you must finish a short or long rest before you can use it again. You can use this feature twice between rests starting at 17th level.");
        chars.put((short) 5, "Extra Attack\nYou can attack twice, instead of once, whenever you take the Attack action on your turn.");
        chars.put((short) 9, "Indomitable\nYou can reroll a saving throw that you fail. If you do so, you must use the new roll. You can use this feature once between long rests. You can use it twice starting at 13th level and three times starting at 17th level.");
        chars.put((short) 11, "Extra Attack (2)\nYou can attack three times whenever you take the Attack action on your turn.");
        chars.put((short) 20, "Extra Attack (3)\nYou can attack four times whenever you take the Attack action on your turn.");
        return new DndClassSeed("Fighter", 10, chars, List.of("Strength", "Constitution"));
    }

    private DndClassSeed createMonk() {
        HashMap<Short, String> chars = new HashMap<>();
        chars.put((short) 1, "Unarmored Defense\nWhile you are wearing no armor and not wielding a shield, your AC equals 10 + your Dexterity modifier + your Wisdom modifier.");
        chars.put((short) 1, "Martial Arts\nYour practice of martial arts gives you mastery of combat styles that use unarmed strikes and monk weapons. You gain benefits while unarmed or wielding only monk weapons and not wearing armor or a shield.");
        chars.put((short) 2, "Ki\nYour training allows you to harness the mystic energy of ki. You have a number of ki points equal to your monk level. You can spend these points to fuel various ki features: Flurry of Blows, Patient Defense, and Step of the Wind.");
        chars.put((short) 2, "Unarmored Movement\nYour speed increases by 10 feet while you are not wearing armor or wielding a shield. This bonus increases as you gain monk levels.");
        chars.put((short) 3, "Deflect Missiles\nYou can use your reaction to deflect or catch the missile when you are hit by a ranged weapon attack. When you do so, the damage you take is reduced by 1d10 + your Dexterity modifier + your monk level.");
        chars.put((short) 4, "Slow Fall\nYou can use your reaction when you fall to reduce any falling damage you take by an amount equal to five times your monk level.");
        chars.put((short) 5, "Extra Attack\nYou can attack twice, instead of once, whenever you take the Attack action on your turn.");
        chars.put((short) 5, "Stunning Strike\nYou can interfere with the flow of ki in an opponent's body. When you hit another creature with a melee weapon attack, you can spend 1 ki point to attempt a stunning strike. The target must succeed on a Constitution saving throw or be stunned until the end of your next turn.");
        chars.put((short) 6, "Ki-Empowered Strikes\nYour unarmed strikes count as magical for the purpose of overcoming resistance and immunity to nonmagical attacks and damage.");
        chars.put((short) 7, "Evasion\nYour instinctive agility lets you dodge out of the way of certain area effects. When you are subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage on a success and only half on a failure.");
        chars.put((short) 7, "Stillness of Mind\nYou can use your action to end one effect on yourself that is causing you to be charmed or frightened.");
        chars.put((short) 10, "Purity of Body\nYour mastery of the ki flowing through you makes you immune to disease and poison.");
        chars.put((short) 13, "Tongue of the Sun and Moon\nYou learn to touch the ki of other minds so that you understand all spoken languages. Moreover, any creature that can understand a language can understand what you say.");
        chars.put((short) 14, "Diamond Soul\nYour mastery of ki grants you proficiency in all saving throws. Additionally, whenever you make a saving throw and fail, you can spend 1 ki point to reroll it and take the second result.");
        chars.put((short) 15, "Timeless Body\nYour ki sustains you so that you suffer none of the frailty of old age, and you can't be aged magically. You can still die of old age, however. You also no longer need food or water.");
        chars.put((short) 18, "Empty Body\nYou can use your action to spend 4 ki points to become invisible for 1 minute. During that time, you also have resistance to all damage but force damage. You can also spend 8 ki points to cast the astral projection spell.");
        chars.put((short) 20, "Perfect Self\nWhen you roll for initiative and have no ki points remaining, you regain 4 ki points.");
        return new DndClassSeed("Monk", 8, chars, List.of("Strength", "Dexterity"));
    }

    private DndClassSeed createPaladin() {
        HashMap<Short, String> chars = new HashMap<>();
        chars.put((short) 1, "Divine Sense\nThe presence of strong evil registers on your senses like a noxious odor. As an action, you can detect the location of any celestial, fiend, or undead within 60 feet that is not behind total cover.");
        chars.put((short) 1, "Lay on Hands\nYour blessed touch can heal wounds. You have a pool of healing power that replenishes when you take a long rest. With that pool, you can restore a total number of hit points equal to your paladin level × 5.");
        chars.put((short) 2, "Fighting Style\nYou adopt a particular style of fighting as your specialty. Choose one fighting style option.");
        chars.put((short) 2, "Spellcasting\nYou have learned to draw on divine magic through meditation and prayer to cast paladin spells using Charisma as your spellcasting ability.");
        chars.put((short) 2, "Divine Smite\nWhen you hit a creature with a melee weapon attack, you can expend one spell slot to deal radiant damage to the target, in addition to the weapon's damage. The extra damage is 2d8 for a 1st-level slot, plus 1d8 for each spell level higher than 1st, to a maximum of 5d8.");
        chars.put((short) 3, "Divine Health\nThe divine magic flowing through you makes you immune to disease.");
        chars.put((short) 5, "Extra Attack\nYou can attack twice, instead of once, whenever you take the Attack action on your turn.");
        chars.put((short) 6, "Aura of Protection\nWhenever you or a friendly creature within 10 feet of you must make a saving throw, the creature gains a bonus to the saving throw equal to your Charisma modifier (minimum of +1). You must be conscious to grant this bonus. At 18th level, the range increases to 30 feet.");
        chars.put((short) 10, "Aura of Courage\nYou and friendly creatures within 10 feet of you can't be frightened while you are conscious. At 18th level, the range increases to 30 feet.");
        chars.put((short) 11, "Improved Divine Smite\nYou are so suffused with righteous might that all your melee weapon strikes carry divine power with them. Whenever you hit a creature with a melee weapon, the creature takes an extra 1d8 radiant damage.");
        chars.put((short) 14, "Cleansing Touch\nYou can use your action to end one spell on yourself or on one willing creature that you touch. You can use this feature a number of times equal to your Charisma modifier (minimum of once).");
        return new DndClassSeed("Paladin", 10, chars, List.of("Wisdom", "Charisma"));
    }

    private DndClassSeed createRanger() {
        HashMap<Short, String> chars = new HashMap<>();
        chars.put((short) 1, "Favored Enemy\nYou have significant experience studying, tracking, hunting, and even talking to a certain type of enemy. Choose a type of favored enemy. You have advantage on Wisdom (Survival) checks to track your favored enemies, as well as on Intelligence checks to recall information about them.");
        chars.put((short) 1, "Natural Explorer\nYou are particularly familiar with one type of natural environment and are adept at traveling and surviving in such regions. When you make an Intelligence or Wisdom check related to your favored terrain, your proficiency bonus is doubled.");
        chars.put((short) 2, "Fighting Style\nYou adopt a particular style of fighting as your specialty. Choose one fighting style option.");
        chars.put((short) 2, "Spellcasting\nYou have learned to use the magical essence of nature to cast spells using Wisdom as your spellcasting ability.");
        chars.put((short) 3, "Primeval Awareness\nYou can use your action and expend one ranger spell slot to focus your awareness on the region around you. For 1 minute per level of the spell slot you expend, you can sense whether the following types of creatures are present within 1 mile of you: aberrations, celestials, dragons, elementals, fey, fiends, and undead.");
        chars.put((short) 5, "Extra Attack\nYou can attack twice, instead of once, whenever you take the Attack action on your turn.");
        chars.put((short) 8, "Land's Stride\nMoving through nonmagical difficult terrain costs you no extra movement. You can also pass through nonmagical plants without being slowed by them and without taking damage from them if they have thorns, spines, or similar hazards.");
        chars.put((short) 10, "Hide in Plain Sight\nYou can spend 1 minute creating camouflage for yourself. Once you are camouflaged, you can try to hide by pressing yourself up against a solid surface. You gain a +10 bonus to Dexterity (Stealth) checks as long as you remain there without moving or taking actions.");
        chars.put((short) 14, "Vanish\nYou can use the Hide action as a bonus action on your turn. Also, you can't be tracked by nonmagical means, unless you choose to leave a trail.");
        chars.put((short) 18, "Feral Senses\nYou gain preternatural senses that help you fight creatures you can't see. When you attack a creature you can't see, your inability to see it doesn't impose disadvantage on your attack rolls against it. You are also aware of the location of any invisible creature within 30 feet of you.");
        chars.put((short) 20, "Foe Slayer\nYou become an unparalleled hunter of your enemies. Once on each of your turns, you can add your Wisdom modifier to the attack roll or the damage roll of an attack you make against one of your favored enemies.");
        return new DndClassSeed("Ranger", 10, chars, List.of("Strength", "Dexterity"));
    }

    private DndClassSeed createRogue() {
        HashMap<Short, String> chars = new HashMap<>();
        chars.put((short) 1, "Expertise\nChoose two of your skill proficiencies, or one of your skill proficiencies and your proficiency with thieves' tools. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies.");
        chars.put((short) 1, "Sneak Attack\nYou know how to strike subtly and exploit a foe's distraction. Once per turn, you can deal extra 1d6 damage to one creature you hit with an attack if you have advantage on the attack roll. The attack must use a finesse or a ranged weapon. The extra damage increases as you gain levels.");
        chars.put((short) 1, "Thieves' Cant\nDuring your rogue training you learned thieves' cant, a secret mix of dialect, jargon, and code that allows you to hide messages in seemingly normal conversation. Only another creature that knows thieves' cant understands such messages.");
        chars.put((short) 2, "Cunning Action\nYour quick thinking and agility allow you to move and act quickly. You can take a bonus action on each of your turns in combat to Dash, Disengage, or Hide.");
        chars.put((short) 5, "Uncanny Dodge\nWhen an attacker that you can see hits you with an attack, you can use your reaction to halve the attack's damage against you.");
        chars.put((short) 6, "Expertise\nChoose two more of your skill proficiencies, or one more skill proficiency and your proficiency with thieves' tools, to gain the benefit of Expertise.");
        chars.put((short) 7, "Evasion\nWhen you are subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw, and only half damage if you fail.");
        chars.put((short) 11, "Reliable Talent\nYou have refined your chosen skills until they approach perfection. Whenever you make an ability check that lets you add your proficiency bonus, you can treat a d20 roll of 9 or lower as a 10.");
        chars.put((short) 14, "Blindsense\nIf you are able to hear, you are aware of the location of any hidden or invisible creature within 10 feet of you.");
        chars.put((short) 15, "Slippery Mind\nYou have acquired greater mental strength. You gain proficiency in Wisdom saving throws.");
        chars.put((short) 18, "Elusive\nYou are so evasive that attackers rarely gain the upper hand against you. No attack roll has advantage against you while you aren't incapacitated.");
        chars.put((short) 20, "Stroke of Luck\nYou have an uncanny knack for succeeding when you need to. If your attack misses a target within range, you can turn the miss into a hit. Alternatively, if you fail an ability check, you can treat the d20 roll as a 20.");
        return new DndClassSeed("Rogue", 8, chars, List.of("Dexterity", "Intelligence"));
    }

    private DndClassSeed createSorcerer() {
        HashMap<Short, String> chars = new HashMap<>();
        chars.put((short) 1, "Spellcasting\nAn event in your past, or in the life of a parent or ancestor, left an indelible mark on you, infusing you with arcane magic. You can cast sorcerer spells using Charisma as your spellcasting ability.");
        chars.put((short) 2, "Font of Magic\nYou tap into a deep wellspring of magic within yourself. This wellspring is represented by sorcery points, which allow you to create a variety of magical effects. You have a number of sorcery points equal to your sorcerer level.");
        chars.put((short) 2, "Flexible Casting\nYou can use your sorcery points to gain additional spell slots, or sacrifice spell slots to gain additional sorcery points.");
        chars.put((short) 3, "Metamagic\nYou gain the ability to twist your spells to suit your needs. You gain two Metamagic options of your choice. You gain another one at 10th and 17th level. You can use only one Metamagic option on a spell when you cast it, unless otherwise noted.");
        chars.put((short) 20, "Sorcerous Restoration\nYou regain 4 expended sorcery points whenever you finish a short rest.");
        return new DndClassSeed("Sorcerer", 6, chars, List.of("Constitution", "Charisma"));
    }

    private DndClassSeed createWarlock() {
        HashMap<Short, String> chars = new HashMap<>();
        chars.put((short) 1, "Pact Magic\nYour arcane research and the magic bestowed on you by your patron have given you facility with spells. You can cast warlock spells using Charisma as your spellcasting ability. You regain all expended spell slots when you finish a short or long rest.");
        chars.put((short) 2, "Eldritch Invocations\nIn your study of occult lore, you have unearthed eldritch invocations, fragments of forbidden knowledge that imbue you with an abiding magical ability. You gain two eldritch invocations of your choice. You learn additional invocations as you gain levels.");
        chars.put((short) 3, "Pact Boon\nYour otherworldly patron bestows a gift upon you for your loyal service. You gain one of the following features of your choice: Pact of the Blade, Pact of the Chain, or Pact of the Tome.");
        chars.put((short) 11, "Mystic Arcanum (6th level)\nYour patron bestows upon you a magical secret called an arcanum. Choose one 6th-level spell from the warlock spell list as this arcanum. You can cast your arcanum spell once without expending a spell slot. You must finish a long rest before you can do so again.");
        chars.put((short) 13, "Mystic Arcanum (7th level)\nChoose one 7th-level warlock spell as your arcanum.");
        chars.put((short) 15, "Mystic Arcanum (8th level)\nChoose one 8th-level warlock spell as your arcanum.");
        chars.put((short) 17, "Mystic Arcanum (9th level)\nChoose one 9th-level warlock spell as your arcanum.");
        chars.put((short) 20, "Eldritch Master\nYou can draw on your inner reserve of mystical power while entreating your patron to regain expended spell slots. You can spend 1 minute entreating your patron for aid to regain all your expended spell slots from your Pact Magic feature. Once you regain spell slots with this feature, you must finish a long rest before you can do so again.");
        return new DndClassSeed("Warlock", 8, chars, List.of("Wisdom", "Charisma"));
    }

    private DndClassSeed createWizard() {
        HashMap<Short, String> chars = new HashMap<>();
        chars.put((short) 1, "Spellcasting\nAs a student of arcane magic, you have a spellbook containing spells that show the first glimmerings of your true power. You can cast wizard spells using Intelligence as your spellcasting ability.");
        chars.put((short) 1, "Arcane Recovery\nYou have learned to regain some of your magical energy by studying your spellbook. Once per day when you finish a short rest, you can choose expended spell slots to recover. The spell slots can have a combined level equal to or less than half your wizard level (rounded up).");
        chars.put((short) 18, "Spell Mastery\nYou have achieved such mastery over certain spells that you can cast them at will. Choose a 1st-level wizard spell and a 2nd-level wizard spell from your spellbook. You can cast those spells at their lowest level without expending a spell slot when you have them prepared.");
        chars.put((short) 20, "Signature Spells\nYou gain mastery over two powerful spells and can cast them with little effort. Choose two 3rd-level wizard spells in your spellbook as your signature spells. You always have these spells prepared, and you can cast each of them once at 3rd level without expending a spell slot.");
        return new DndClassSeed("Wizard", 6, chars, List.of("Intelligence", "Wisdom"));
    }

    private record DndClassSeed(String name, Integer hitDice, HashMap<Short, String> levelCharacteristics, List<String> savingThrows) {
    }
}
