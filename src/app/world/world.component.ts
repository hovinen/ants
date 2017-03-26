import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-world',
  templateUrl: './world.component.html',
  styleUrls: ['./world.component.css']
})
export class WorldComponent implements OnInit {
  private portal: Portal = new Portal();
  private world: World = new World(500);
  private tickIntervalInMs = 50;
  private started = true;
  private ants_ = this.world.ants.map(ant => new ItemViewModel(this.portal, ant));

  constructor() {}

  ngOnInit() {}

  start() {
    this.started = true;
    this.scheduleTick();
  }

  stop() {
    this.started = false;
  }

  click(event) {
    const target = event.target || event.srcElement || event.currentTarget;
    const position =
        this.portal.toPosition(event.clientX - target.offsetLeft, event.clientY - target.offsetTop);
    this.world.addFoodSource(new FoodSource(position, 200));
  }

  tick() {
    if (this.started) {
      this.world.iterate();
      this.scheduleTick();
    }
  }

  scheduleTick() {
    setTimeout(() => this.tick(), this.tickIntervalInMs);
  }

  get ants(): Array<ItemViewModel> {
    return this.ants_;
  }

  get foodSources(): Array<ItemViewModel> {
    return this.world.foodSources.map(foodSource => new ItemViewModel(this.portal, foodSource));
  }
}

class ItemViewModel {
  private portal: Portal;
  private item: Item;

  constructor(portal: Portal, item: Item) {
    this.portal = portal;
    this.item = item;
  }

  get top(): string {
    return this.portal.toY(this.item.y) + 'px';
  }

  get left(): string {
    return this.portal.toX(this.item.x) + 'px';
  }

  get width(): string {
    return this.portal.antWidth + 'px';
  }

  get height(): string {
    return this.portal.antHeight + 'px';
  }
}

class Portal {
  private scaleX: number = 5;
  private scaleY: number = 5;
  private deltaX: number = 500;
  private deltaY: number = 400;

  get antWidth(): number {
    return this.scaleX;
  }

  get antHeight(): number {
    return this.scaleY;
  }

  toX(index: number): number {
    return index * this.scaleX + this.deltaX;
  }

  toY(index: number): number {
    return index * this.scaleY + this.deltaY;
  }

  toPosition(x: number, y: number): Position {
    return new Position(
        Math.floor((x - this.deltaX) / this.scaleX), Math.floor((y - this.deltaY) / this.scaleY));
  }
}

class World {
  private ants_: Array<Ant> = [];
  private foodSources_: Map<string, FoodSource> = new Map();

  constructor(antCount: number) {
    this.createAnts(antCount);
  }

  private createAnts(antCount: number) {
    for (let i = 0; i < antCount; ++i) {
      this.ants_.push(new Ant(new Position(0, 0)));
    }
  }

  get ants(): Array<Ant> {
    return this.ants_;
  }

  get foodSources(): Array<FoodSource> {
    return Array.from(this.foodSources_.values());
  }

  addFoodSource(foodSource: FoodSource) {
    this.foodSources_.set(foodSource.position.key, foodSource);
  }

  iterate() {
    const antPositions: Map<string, Array<Ant>> = new Map();
    for (const ant of this.ants_) {
      ant.move();
      if (!antPositions.has(ant.positionKey)) {
        antPositions.set(ant.positionKey, []);
      }
      antPositions.get(ant.positionKey).push(ant);
      if (this.foodSources_.has(ant.positionKey)) {
        const foodSource = this.foodSources_.get(ant.positionKey);
        ant.consume(foodSource);
        if (foodSource.isExhausted) {
          this.foodSources_.delete(ant.positionKey);
        }
      }
    }
    antPositions.forEach((antArray, key) => Ant.communicate(antArray));
  }
}

interface Item {
  x: number;
  y: number;
}

class Ant implements Item {
  private position_: Position;
  private foodPosition_: Position;
  private homePosition_: Position;
  private hasFood: boolean;

  private static newDelta(): number {
    return Math.floor(Math.random() * 3) - 1;
  }

  public static communicate(ants: Array<Ant>) {
    const foodPosition = Ant.findFood(ants);
    for (const ant of ants) {
      if (ant.foodPosition_ == null) {
        ant.foodPosition_ = foodPosition;
      }
    }
  }

  public static findFood(ants: Array<Ant>): Position {
    for (const ant of ants) {
      if (ant.foodPosition_ != null) {
        return ant.position_;
      }
    }
  }

  constructor(initialPosition: Position) {
    this.position_ = initialPosition;
    this.homePosition_ = initialPosition;
  }

  get x(): number {
    return this.position_.x;
  }

  get y(): number {
    return this.position_.y;
  }

  get positionKey(): string {
    return this.position_.key;
  }

  move() {
    if (this.hasFood) {
      this.moveTowards(this.homePosition_);
      if (this.position_.key === this.homePosition_.key) {
        this.hasFood = false;
      }
    } else if (this.foodPosition_ != null) {
      this.moveTowards(this.foodPosition_);
      if (this.position_.key === this.foodPosition_.key) {
        this.foodPosition_ = null;
      }
    } else {
      this.position_ = this.position_.plusDelta(Ant.newDelta(), Ant.newDelta());
    }
  }

  private moveTowards(position: Position) {
    this.position_ = this.position_.inDirectionOf(position);
  }

  consume(foodSource: FoodSource) {
    foodSource.consume();
    this.foodPosition_ = foodSource.position;
    this.hasFood = true;
  }
}

class Position {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  plusDelta(x: number, y: number): Position {
    return new Position(this.x + x, this.y + y);
  }

  inDirectionOf(position: Position) {
    const deltaX = position.x - this.x;
    const deltaY = position.y - this.y;
    if (deltaX === 0 && deltaY === 0) {
      return this;
    } else if (deltaX === 0) {
      return this.plusDelta(0, deltaY / Math.abs(deltaY));
    } else if (deltaY === 0) {
      return this.plusDelta(deltaX / Math.abs(deltaX), 0);
    } else {
      const ratio = Math.abs(deltaY / deltaX);
      if (ratio < 0.5) {
        return this.plusDelta(deltaX / Math.abs(deltaX), 0);
      } else if (ratio > 2) {
        return this.plusDelta(0, deltaY / Math.abs(deltaY));
      } else {
        return this.plusDelta(deltaX / Math.abs(deltaX), deltaY / Math.abs(deltaY));
      }
    }
  }

  get key(): string {
    return this.x + ',' + this.y;
  }
}

class FoodSource implements Item {
  private position_: Position;
  private count: number;

  constructor(position: Position, count: number) {
    this.position_ = position;
    this.count = count;
  }

  consume() {
    if (this.count > 0) {
      this.count--;
    }
  }

  get isExhausted() {
    return this.count === 0;
  }

  get x(): number {
    return this.position_.x;
  }

  get y(): number {
    return this.position_.y;
  }

  get position(): Position {
    return this.position_;
  }
}
