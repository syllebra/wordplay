import csv
from tqdm import tqdm
import random
from unidecode import unidecode
import pickle

# #from https://cs.stackexchange.com/questions/143527/counting-number-of-swaps-to-make-two-strings-equal-in-linear-time
# def count_intersections(s1, s2):
#   # Loop invariant: (l, r) are endpoints of the intersecting interval such that
#   # (l <= j < r) if and only if as[i] and bs[j] intersect.
#   l, r = 0, 0
#   total = 0
#   for i in range(len(s1)):
#     while r < len(s2) and s2[r].1 < s1[i].1:
#       r += 1
#     while l < r and not (s1[i].0 < s2[l].0):
#       l += 1
#     total += r - l
#   return total

def load_scrabble_official(file = "French ODS dictionary.txt"):
    officiel_scrabble = {}
    with open(file, 'r') as file:
        # Iterate over the lines of the file
        for line in tqdm(file):
            # Remove the newline character at the end of the line
            w = unidecode(line.strip().lower())
            officiel_scrabble[w] = line
    print(len(officiel_scrabble))
    return officiel_scrabble


def get_words_from_csv(file, row_num=0, delimiter="\t"):
    all = []
    with open(file) as csvfile:
        reader = csv.reader(csvfile, delimiter=delimiter)
        cols = reader.__next__()
        for row in tqdm(reader):
            all.append(row[row_num])
    return all

def sub_len(length):
    l1 = length // 2
    l2 = length - l1
    return l1, l2

def create_data_maps(words, length_to_keep = [3,4,6,5,7,8,9,10], filter_official=None):
    data= {}
    data["words"] = {l:{} for l in length_to_keep}
    for init_word in  words:
        word = unidecode(init_word).lower()
        if(filter_official is not None and word not in filter_official): continue        
        avoid = "\"'()/\\"
        forbiden = False

        for c in avoid:
            if(c in word):
                forbiden = True
                break
        if(forbiden):
            continue
        if(len(word.split())>1 or len(word.split('-'))>1):
            continue
        l = len(word)
        if(l in length_to_keep and word not in data["words"][l]):
            data["words"][l][word] = init_word


    sorted_map = {l:{} for l in length_to_keep}
    for l,ws in data["words"].items():
        for w,v in ws.items():
            sw = ''.join(sorted(w))
            if(sw in sorted_map[l]):
                sorted_map[l][sw].append(v)
            else:
                sorted_map[l][sw] = [v]
        print(l, " => ", len(ws), " / ", len(sorted_map[l]))            
    return data, sorted_map

def assemble_and_filter(all_words, common_words, games_lengths = [6,7,8,9,10], filter_official=None):

    l_to_keep = set()
    for c in  games_lengths:
        l_to_keep.add(c)
        l1, l2 = sub_len(c)
        if(l1 not in l_to_keep):
            l_to_keep.add(l1)
        if(l2 not in l_to_keep):
            l_to_keep.add(l2)

    data, full_dict_sorted_maps = create_data_maps(all_words, length_to_keep=l_to_keep, filter_official=filter_official)
    _, common_sorted_maps = create_data_maps(common_words, length_to_keep=l_to_keep, filter_official=filter_official)

    sorted_maps = {}

    for c in games_lengths:
        l1, l2 = sub_len(c)
        # filter: keep only "common ones" if there is no anagrams
        #sorted_maps[l1+l2] = common_sorted_maps[l1+l2]
        sorted_maps[l1] = full_dict_sorted_maps[l1]
        sorted_maps[l2] = full_dict_sorted_maps[l2]
        sorted_maps[l1+l2] = {k:v for  k,v in common_sorted_maps[l1+l2].items() if len(v)==1 and
                            k in full_dict_sorted_maps[l1+l2] and len(full_dict_sorted_maps[l1+l2][k])==1}
    return sorted_maps



def create_games(l1,l2, sorted_map):
    R = l1+l2
    game = {}
    for w1 in tqdm(sorted_map[l1]):
        for w2 in sorted_map[l2]:
            compo = ''.join(sorted(f"{w1}{w2}"))
            if(compo in sorted_map[R]):
                if(len(sorted_map[R][compo]) <= 1):
                    #print(sorted_map[l1][w1],'/',sorted_map[l2][w2],"=>",sorted_map[R][compo])
                    g={"w1":random.choice(sorted_map[l1][w1]),
                    "w2":random.choice(sorted_map[l2][w2]),
                    "R":random.choice(sorted_map[R][compo])}
                    if(compo not in game):
                        game[compo] = [g]
                    else:
                        game[compo].append(g)
    return game

def print_all(games):
    for game in list(games.values()):
        g = random.choice(game)
        print(f'{g["w1"].upper() } / {g["w2"].upper() }')

def interactive(games):
    while(True):
        game = random.choice(list(games.values()))
        g = random.choice(game)

        found = False
        while(not found):
            answer = input(f'{g["w1"].upper() } / {g["w2"].upper() } ? \n => ')
            answer = unidecode(answer.strip().lower())
            if(answer in ["q","quit","exit"] ):
                exit()
            elif(answer == "cat"):
                print(f"The answer is {g['R'].upper()}.")
                found = True
            else:
                if(answer == g["R"]):
                    print("Awesome, you found: ",g["R"].upper())
                    found = True
                else:
                    print(f"{answer.upper()} is not the correct answer.")
                    # TODO: check if valid anwer anyway
            
def init():
    games = {}
    officiel_scrabble = load_scrabble_official()
    all = get_words_from_csv('DEM-1_1.csv', row_num=0, delimiter="\t")
    # common = get_words_from_csv('frequence.csv', row_num=2, delimiter=";")
    common = get_words_from_csv('frequency.txt', row_num=0, delimiter=";")
    
    categories = [6,7,8,9,10,11,12]
    sorted_maps = assemble_and_filter(all, common, games_lengths=categories, filter_official=officiel_scrabble)
    for c in categories:
        l1, l2 = sub_len(c)
        games[c] = create_games(l1,l2,sorted_maps)
        print(f"{c} letters games ({l1}+{l2}): {len(games[c])}")
    return games

#print(random.choice(list(games.values())))
if __name__ == "__main__":
    import json
    games = init()

    with open('full.games','wb') as f:
        #json.dump(games, f, indent = 4)   
        pickle.dump(games, f)