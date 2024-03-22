import random
import pickle
import os


from typing import Union
from fastapi import FastAPI
from pydantic import BaseModel
from unidecode import unidecode

app = FastAPI()
with open(os.path.join(os.path.dirname(__file__),"full.games"), "rb") as file:
    games = pickle.load(file)


def random_wordcomp(length: int):
    game = random.choice(list(games[length].values()))
    g = random.choice(game)
    return g

def check_solution(w1,w2, proposition):
    print(f"Checking if {w1} & {w2} gives {proposition}...")
    l1 = len(w1.strip())
    l2 = len(w2.strip())
    R=len(proposition.strip())
    print(f"Checking if {l1} + {l2} gives {R}...")
    if(l1+l2 != R):
        return False, {"error":"EC1", "message":"The sum of length is not the same!"}
    if(R not in games):
        return False, {"error":"EC2", "message":"No games of this length!"}
    combined=''.join(sorted(unidecode(w1+w2).lower()))
    sp = ''.join(sorted(unidecode(proposition.lower())))
    if(combined != sp):
        return False, {"error":"EC3", "message":"Letters doesn't match!"}

    if(sp not in games[R]):
        return False, {"error":"EC4", "message":"The word you entered is not in our database. Check if it fits the rules."}
    
    found =None
    
    for g in games[R][sp]:

        w1t = unidecode(w1.lower().strip())
        w2t = unidecode(w2.lower().strip())
        w1g = unidecode(g["w1"].strip())
        w2g = unidecode(g["w2"].strip())

        if((w1g == w1t and w2g == w2t) or (w1g== w2t and w2g == w1t)):
            found = g
            break
    
    if(not found):
        return False, {"error":"EC5", "message":"The words you entered are not in our database. Check if it fits the rules."}

    
    rt = unidecode(proposition.lower().strip())
    rg = unidecode(g["R"].lower().strip())
    if(rt != rg):
        return False, {"error":"EC6", "message":"The words you entered exists in our database, but your proposition does not match."}
    
    success = f"{g['w1']} & {g['w2']} gives {found['R']}. (you entered: {proposition})"
    return True, {"found": g}
    
        #TODO: check if in scrabble official
# print(game[random.choice(game.keys())])
    
class Item(BaseModel):
    name: str
    price: float
    is_offer: Union[bool, None] = None


@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/api/games/")
def all_games():
    return games

@app.get("/api/random/{length}")
def random_games(length: int, num: Union[str, None] = None):
    if(length not in games):
        return {"ERROR":f"{length} long words not available."}

    number = 1
    export_all_games = False
    try:
        number = int(num)
    except Exception:
        if(num == "all"):
            export_all_games = True

    ret = []
    if(export_all_games):
        for _,v in games[length].items():
            wc = random.choice(v).copy()
            if("R" in wc):
                del(wc["R"])
            ret.append(wc)
    else:
        for _ in range(number):
            wc = random_wordcomp(length)
            if("R" in wc):
                del(wc["R"])
            ret.append(wc)
    return ret
    
@app.get("/api/check/{w1}/{w2}/{proposition}")
def check(w1: str, w2: str, proposition: str):
    success, expl = check_solution(w1,w2,proposition)
    expl["success"]=success
    return expl

# @app.get("/items/{item_id}")
# def read_item(item_id: int, q: Union[str, None] = None):
#     return {"item_id": item_id, "q": q}


# @app.put("/items/{item_id}")
# def update_item(item_id: int, item: Item):
#     return {"item_name": item.name, "item_id": item_id}

if __name__ == "__main__":
    with open("full.games", "rb") as file:
        games = pickle.load(file)
